import { CommandHandlerArgs, CommandResult } from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2DecreaseLiquidityOutput } from './output';
import type {
  SaucerSwapV2DecreaseLiquidityBuildResult,
  SaucerSwapV2DecreaseLiquidityExecuteResult,
  SaucerSwapV2DecreaseLiquidityNormalizedParams,
  SaucerSwapV2DecreaseLiquiditySignResult,
} from './types';

import { ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { Interface } from 'ethers';

import { FACTORY_ABI } from '@/plugins/saucerswap-v2/abi/factory';
import { NFT_POSITION_MANAGER_ABI } from '@/plugins/saucerswap-v2/abi/nft-position-manager';
import { POOL_ABI } from '@/plugins/saucerswap-v2/abi/pool';
import {
  EVM_0_ADDRESS,
  getSaucerSwapV2Config,
  MAX_UINT128,
} from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { getAmountsForLiquidity } from '@/plugins/saucerswap-v2/utils/tick-math';
import { computeDeadline } from '@/shared/util/deadline';
import { computeMinOutput } from '@/shared/util/slippage';

import { SaucerSwapV2DecreaseLiquidityInputSchema } from './input';
import { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';

export const SAUCERSWAP_V2_DECREASE_LIQUIDITY_COMMAND_NAME =
  'saucerswap-v2_decrease-liquidity';

export class SaucerSwapV2DecreaseLiquidityCommand extends BaseTransactionCommand<
  SaucerSwapV2DecreaseLiquidityNormalizedParams,
  SaucerSwapV2DecreaseLiquidityBuildResult,
  SaucerSwapV2DecreaseLiquiditySignResult,
  SaucerSwapV2DecreaseLiquidityExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;

  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_DECREASE_LIQUIDITY_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2DecreaseLiquidityNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2DecreaseLiquidityInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const positionAbi = new Interface(NFT_POSITION_MANAGER_ABI);
    let posResult;
    try {
      posResult = await api.contractQuery.queryContractFunction({
        abiInterface: positionAbi,
        contractIdOrEvmAddress: config.nftManagerContractId,
        functionName: 'positions',
        args: [BigInt(validArgs.position)],
      });
    } catch (e) {
      throw new ValidationError(
        `Could not read V2 position ${validArgs.position} from NonfungiblePositionManager. Check the serial and network.`,
        { context: { cause: e } },
      );
    }

    const token0Evm = posResult.queryResult[2] as string;
    const token1Evm = posResult.queryResult[3] as string;
    const fee = Number(posResult.queryResult[4]);
    const tickLower = Number(posResult.queryResult[5]);
    const tickUpper = Number(posResult.queryResult[6]);

    const factoryAbi = new Interface(FACTORY_ABI);
    const getPoolResult = await api.contractQuery.queryContractFunction({
      abiInterface: factoryAbi,
      contractIdOrEvmAddress: config.factoryContractId,
      functionName: 'getPool',
      args: [token0Evm, token1Evm, fee],
    });
    const poolAddress = getPoolResult.queryResult[0] as string | undefined;
    if (!poolAddress || poolAddress === EVM_0_ADDRESS) {
      throw new ValidationError(
        `Pool not found for position ${validArgs.position}`,
        { context: { token0Evm, token1Evm, fee } },
      );
    }

    const poolAbi = new Interface(POOL_ABI);
    const slot0 = await api.contractQuery.queryContractFunction({
      abiInterface: poolAbi,
      contractIdOrEvmAddress: poolAddress,
      functionName: 'slot0',
    });
    const sqrtPriceX96 = BigInt(
      slot0.queryResult[0] as string | bigint | number,
    );

    const liquidity = BigInt(validArgs.liquidity);
    const { amount0, amount1 } = getAmountsForLiquidity(
      sqrtPriceX96,
      tickLower,
      tickUpper,
      liquidity,
    );

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

    return {
      config,
      tokenSN: BigInt(validArgs.position),
      liquidity,
      amount0Min: computeMinOutput(amount0, validArgs.slippage),
      amount1Min: computeMinOutput(amount1, validArgs.slippage),
      recipientEvmAddress: recipient,
      unwrapHbar: validArgs.unwrapHbar,
      burn: validArgs.burn,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2DecreaseLiquidityNormalizedParams,
  ): Promise<SaucerSwapV2DecreaseLiquidityBuildResult> {
    const deadline = computeDeadline(params.deadlineSeconds);

    const decreaseEncoded = encodeContractCall(
      NFT_POSITION_MANAGER_ABI,
      'decreaseLiquidity',
      [
        {
          tokenSN: params.tokenSN,
          liquidity: params.liquidity,
          amount0Min: params.amount0Min,
          amount1Min: params.amount1Min,
          deadline,
        },
      ],
    );

    const collectEncoded = encodeContractCall(
      NFT_POSITION_MANAGER_ABI,
      'collect',
      [
        {
          tokenSN: params.tokenSN,
          recipient: params.recipientEvmAddress,
          amount0Max: MAX_UINT128,
          amount1Max: MAX_UINT128,
        },
      ],
    );

    const calls: Uint8Array[] = [decreaseEncoded, collectEncoded];

    if (params.unwrapHbar) {
      const unwrapEncoded = encodeContractCall(
        NFT_POSITION_MANAGER_ABI,
        'unwrapWHBAR',
        [0n, params.recipientEvmAddress],
      );
      calls.push(unwrapEncoded);
    }
    if (params.burn) {
      const burnEncoded = encodeContractCall(NFT_POSITION_MANAGER_ABI, 'burn', [
        params.tokenSN,
      ]);
      calls.push(burnEncoded);
    }

    const functionParameters = encodeMulticall(NFT_POSITION_MANAGER_ABI, calls);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.config.nftManagerContractId))
      .setGas(params.gas)
      .setFunctionParameters(functionParameters);

    return { transaction: tx };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2DecreaseLiquidityNormalizedParams,
    build: SaucerSwapV2DecreaseLiquidityBuildResult,
  ): Promise<SaucerSwapV2DecreaseLiquiditySignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2DecreaseLiquidityNormalizedParams,
    _build: SaucerSwapV2DecreaseLiquidityBuildResult,
    sign: SaucerSwapV2DecreaseLiquiditySignResult,
  ): Promise<SaucerSwapV2DecreaseLiquidityExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 decrease-liquidity failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2DecreaseLiquidityNormalizedParams,
    _build: SaucerSwapV2DecreaseLiquidityBuildResult,
    _sign: SaucerSwapV2DecreaseLiquiditySignResult,
    execute: SaucerSwapV2DecreaseLiquidityExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2DecreaseLiquidityOutput = {
      contractId: params.config.nftManagerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      tokenSN: params.tokenSN.toString(),
      liquidity: params.liquidity.toString(),
      unwrapHbar: params.unwrapHbar,
      burn: params.burn,
    };
    return { result: outputData };
  }
}

export async function saucerswapV2DecreaseLiquidity(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2DecreaseLiquidityCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
