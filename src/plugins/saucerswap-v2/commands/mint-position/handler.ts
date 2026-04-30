import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV2MintPositionOutput } from './output';
import type {
  SaucerSwapV2MintPositionBuildResult,
  SaucerSwapV2MintPositionExecuteResult,
  SaucerSwapV2MintPositionNormalizedParams,
  SaucerSwapV2MintPositionSignResult,
} from './types';

import {
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  HbarUnit,
} from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { Interface } from 'ethers';

import { FACTORY_ABI } from '@/plugins/saucerswap-v2/abi/factory';
import { NFT_POSITION_MANAGER_ABI } from '@/plugins/saucerswap-v2/abi/nft-position-manager';
import { POOL_ABI } from '@/plugins/saucerswap-v2/abi/pool';
import {
  EVM_0_ADDRESS,
  FEE_TIER_TO_TICK_SPACING,
  getSaucerSwapV2Config,
} from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { tickRangeFromPercent } from '@/plugins/saucerswap-v2/utils/tick-math';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import { computeMinOutput } from '@/shared/util/slippage';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV2MintPositionInputSchema } from './input';

export const SAUCERSWAP_V2_MINT_POSITION_COMMAND_NAME =
  'saucerswap-v2_mint-position';

export class SaucerSwapV2MintPositionCommand extends BaseTransactionCommand<
  SaucerSwapV2MintPositionNormalizedParams,
  SaucerSwapV2MintPositionBuildResult,
  SaucerSwapV2MintPositionSignResult,
  SaucerSwapV2MintPositionExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;
  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_MINT_POSITION_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2MintPositionNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2MintPositionInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const aIsHbar = isHbar(validArgs.tokenA.value, config.whbarTokenId);
    const bIsHbar = isHbar(validArgs.tokenB.value, config.whbarTokenId);
    if (aIsHbar && bIsHbar) {
      throw new ValidationError('Both tokens cannot be HBAR');
    }

    const whbar = tokenEvmAddress(config.whbarTokenId);

    const [tokenAResolved, tokenBResolved] = await Promise.all([
      this.saucerSwapHelper.resolveToken({
        value: validArgs.tokenA.value,
        type: validArgs.tokenA.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
      this.saucerSwapHelper.resolveToken({
        value: validArgs.tokenB.value,
        type: validArgs.tokenB.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
    ]);
    const infoA = tokenAResolved.tokenInfo;
    const infoB = tokenBResolved.tokenInfo;

    const tokenAEvm = aIsHbar ? whbar : tokenEvmAddress(infoA.token_id);
    const tokenBEvm = bIsHbar ? whbar : tokenEvmAddress(infoB.token_id);

    const [token0Evm, token1Evm, swapped] =
      tokenAEvm.toLowerCase() < tokenBEvm.toLowerCase()
        ? [tokenAEvm, tokenBEvm, false]
        : [tokenBEvm, tokenAEvm, true];

    let decA = 0;
    if (!isRawUnits(validArgs.amountA)) {
      decA = parseInt(infoA.decimals) || 0;
    }
    const rawAmountA = processTokenBalanceInput(validArgs.amountA, decA);
    let decB = 0;
    if (!isRawUnits(validArgs.amountB)) {
      decB = parseInt(infoB.decimals) || 0;
    }
    const rawAmountB = processTokenBalanceInput(validArgs.amountB, decB);

    const amount0Desired = swapped ? rawAmountB : rawAmountA;
    const amount1Desired = swapped ? rawAmountA : rawAmountB;

    const factoryAbi = new Interface(FACTORY_ABI);
    const getPoolResult = await api.contractQuery.queryContractFunction({
      abiInterface: factoryAbi,
      contractIdOrEvmAddress: config.factoryContractId,
      functionName: 'getPool',
      args: [token0Evm, token1Evm, validArgs.feeTier],
    });

    const poolAddress = getPoolResult.queryResult[0] as string | undefined;
    if (!poolAddress || poolAddress === EVM_0_ADDRESS) {
      throw new NotFoundError(
        `Pool not found for tokens ${token0Evm} / ${token1Evm} @ fee tier ${validArgs.feeTier}`,
        { context: { token0Evm, token1Evm, feeTier: validArgs.feeTier } },
      );
    }

    const tickSpacing = FEE_TIER_TO_TICK_SPACING[validArgs.feeTier];
    let tickLower: number;
    let tickUpper: number;
    if (
      validArgs.tickLower !== undefined &&
      validArgs.tickUpper !== undefined
    ) {
      tickLower = validArgs.tickLower;
      tickUpper = validArgs.tickUpper;
    } else {
      const poolAbi = new Interface(POOL_ABI);
      const slot0 = await api.contractQuery.queryContractFunction({
        abiInterface: poolAbi,
        contractIdOrEvmAddress: poolAddress,
        functionName: 'slot0',
      });
      const currentTick = Number(slot0.queryResult[1]);
      const range = tickRangeFromPercent(
        currentTick,
        validArgs.rangePercent,
        tickSpacing,
      );
      tickLower = range.tickLower;
      tickUpper = range.tickUpper;
    }

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

    const hbarSide: '0' | '1' | null = (() => {
      if (!aIsHbar && !bIsHbar) return null;
      const hbarIsA = aIsHbar;
      return (hbarIsA && !swapped) || (!hbarIsA && swapped) ? '0' : '1';
    })();

    return {
      config,
      token0Evm,
      token1Evm,
      hbarSide,
      feeTier: validArgs.feeTier,
      tickLower,
      tickUpper,
      amount0Desired,
      amount1Desired,
      amount0Min: computeMinOutput(amount0Desired, validArgs.slippage),
      amount1Min: computeMinOutput(amount1Desired, validArgs.slippage),
      recipientEvmAddress: recipient,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      keyRefIds: [],
      network,
    };
  }

  async buildTransaction(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2MintPositionNormalizedParams,
  ): Promise<SaucerSwapV2MintPositionBuildResult> {
    const deadline = computeDeadline(params.deadlineSeconds);

    const mintParams = {
      token0: params.token0Evm,
      token1: params.token1Evm,
      fee: params.feeTier,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired: params.amount0Desired,
      amount1Desired: params.amount1Desired,
      amount0Min: params.amount0Min,
      amount1Min: params.amount1Min,
      recipient: params.recipientEvmAddress,
      deadline,
    };

    const mintEncoded = encodeContractCall(NFT_POSITION_MANAGER_ABI, 'mint', [
      mintParams,
    ]);

    let functionParameters: Uint8Array;
    if (params.hbarSide !== null) {
      const refundEncoded = encodeContractCall(
        NFT_POSITION_MANAGER_ABI,
        'refundETH',
        [],
      );
      functionParameters = encodeMulticall(NFT_POSITION_MANAGER_ABI, [
        mintEncoded,
        refundEncoded,
      ]);
    } else {
      functionParameters = mintEncoded;
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.config.nftManagerContractId))
      .setGas(params.gas)
      .setFunctionParameters(functionParameters);

    if (params.hbarSide !== null) {
      const hbarAmount =
        params.hbarSide === '0' ? params.amount0Desired : params.amount1Desired;
      tx.setPayableAmount(Hbar.from(toBigNumber(hbarAmount), HbarUnit.Tinybar));
    }

    return { transaction: tx };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2MintPositionNormalizedParams,
    build: SaucerSwapV2MintPositionBuildResult,
  ): Promise<SaucerSwapV2MintPositionSignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2MintPositionNormalizedParams,
    _build: SaucerSwapV2MintPositionBuildResult,
    sign: SaucerSwapV2MintPositionSignResult,
  ): Promise<SaucerSwapV2MintPositionExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 mint-position failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2MintPositionNormalizedParams,
    _build: SaucerSwapV2MintPositionBuildResult,
    _sign: SaucerSwapV2MintPositionSignResult,
    execute: SaucerSwapV2MintPositionExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2MintPositionOutput = {
      contractId: params.config.nftManagerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      feeTier: params.feeTier,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired: params.amount0Desired.toString(),
      amount1Desired: params.amount1Desired.toString(),
    };
    return { result: outputData };
  }
}

export async function saucerswapV2MintPosition(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2MintPositionCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
