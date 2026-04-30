import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2IncreaseLiquidityOutput } from './output';
import type {
  SaucerSwapV2IncreaseLiquidityBuildResult,
  SaucerSwapV2IncreaseLiquidityExecuteResult,
  SaucerSwapV2IncreaseLiquidityNormalizedParams,
  SaucerSwapV2IncreaseLiquiditySignResult,
} from './types';

import {
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  HbarUnit,
} from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  EntityReferenceType,
  HBAR_DECIMALS,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { Interface } from 'ethers';

import { NFT_POSITION_MANAGER_ABI } from '@/plugins/saucerswap-v2/abi/nft-position-manager';
import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { computeMinOutput } from '@/shared/util/slippage';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';

import { SaucerSwapV2IncreaseLiquidityInputSchema } from './input';
import { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';

export const SAUCERSWAP_V2_INCREASE_LIQUIDITY_COMMAND_NAME =
  'saucerswap-v2_increase-liquidity';

export class SaucerSwapV2IncreaseLiquidityCommand extends BaseTransactionCommand<
  SaucerSwapV2IncreaseLiquidityNormalizedParams,
  SaucerSwapV2IncreaseLiquidityBuildResult,
  SaucerSwapV2IncreaseLiquiditySignResult,
  SaucerSwapV2IncreaseLiquidityExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;

  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_INCREASE_LIQUIDITY_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2IncreaseLiquidityNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2IncreaseLiquidityInputSchema.parse(args.args);
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
    if (!token0Evm || !token1Evm) {
      throw new ValidationError(
        'Invalid position data (missing token0/token1).',
        {
          context: { position: validArgs.position },
        },
      );
    }

    const [t0, t1] = await Promise.all([
      this.saucerSwapHelper.resolveToken({
        value: token0Evm,
        type: EntityReferenceType.EVM_ADDRESS,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
      this.saucerSwapHelper.resolveToken({
        value: token1Evm,
        type: EntityReferenceType.EVM_ADDRESS,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
    ]);

    let d0 = 0;
    if (!isRawUnits(validArgs.amountA)) {
      d0 = parseInt(t0.tokenInfo.decimals) || 0;
    }
    const amount0Desired = processTokenBalanceInput(validArgs.amountA, d0);
    let d1 = 0;
    if (!isRawUnits(validArgs.amountB)) {
      d1 = parseInt(t1.tokenInfo.decimals) || 0;
    }
    const amount1Desired = processTokenBalanceInput(validArgs.amountB, d1);

    let hbarAmount: bigint | null = null;
    if (validArgs.hbarAmount !== undefined) {
      const hDec = isRawUnits(validArgs.hbarAmount) ? 0 : HBAR_DECIMALS;
      hbarAmount = processTokenBalanceInput(validArgs.hbarAmount, hDec);
    }

    return {
      config,
      tokenSN: BigInt(validArgs.position),
      amount0Desired,
      amount1Desired,
      amount0Min: computeMinOutput(amount0Desired, validArgs.slippage),
      amount1Min: computeMinOutput(amount1Desired, validArgs.slippage),
      hbarAmount,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      keyRefIds: [],
      network,
    };
  }

  async buildTransaction(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2IncreaseLiquidityNormalizedParams,
  ): Promise<SaucerSwapV2IncreaseLiquidityBuildResult> {
    const deadline = computeDeadline(params.deadlineSeconds);
    const callParams = {
      tokenSN: params.tokenSN,
      amount0Desired: params.amount0Desired,
      amount1Desired: params.amount1Desired,
      amount0Min: params.amount0Min,
      amount1Min: params.amount1Min,
      deadline,
    };
    const increaseEncoded = encodeContractCall(
      NFT_POSITION_MANAGER_ABI,
      'increaseLiquidity',
      [callParams],
    );

    let functionParameters: Uint8Array;
    if (params.hbarAmount !== null) {
      const refundEncoded = encodeContractCall(
        NFT_POSITION_MANAGER_ABI,
        'refundETH',
        [],
      );
      functionParameters = encodeMulticall(NFT_POSITION_MANAGER_ABI, [
        increaseEncoded,
        refundEncoded,
      ]);
    } else {
      functionParameters = increaseEncoded;
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.config.nftManagerContractId))
      .setGas(params.gas)
      .setFunctionParameters(functionParameters);
    if (params.hbarAmount !== null) {
      tx.setPayableAmount(
        Hbar.from(toBigNumber(params.hbarAmount), HbarUnit.Tinybar),
      );
    }
    return { transaction: tx };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2IncreaseLiquidityNormalizedParams,
    build: SaucerSwapV2IncreaseLiquidityBuildResult,
  ): Promise<SaucerSwapV2IncreaseLiquiditySignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2IncreaseLiquidityNormalizedParams,
    _build: SaucerSwapV2IncreaseLiquidityBuildResult,
    sign: SaucerSwapV2IncreaseLiquiditySignResult,
  ): Promise<SaucerSwapV2IncreaseLiquidityExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 increase-liquidity failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2IncreaseLiquidityNormalizedParams,
    _build: SaucerSwapV2IncreaseLiquidityBuildResult,
    _sign: SaucerSwapV2IncreaseLiquiditySignResult,
    execute: SaucerSwapV2IncreaseLiquidityExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2IncreaseLiquidityOutput = {
      contractId: params.config.nftManagerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      tokenSN: params.tokenSN.toString(),
      amount0Desired: params.amount0Desired.toString(),
      amount1Desired: params.amount1Desired.toString(),
    };
    return { result: outputData };
  }
}

export async function saucerswapV2IncreaseLiquidity(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2IncreaseLiquidityCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
