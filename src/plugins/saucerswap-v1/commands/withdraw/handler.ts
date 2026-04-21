import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1WithdrawOutput } from './output';
import type {
  SaucerSwapV1WithdrawBuildTransactionResult,
  SaucerSwapV1WithdrawExecuteTransactionResult,
  SaucerSwapV1WithdrawNormalizedParams,
  SaucerSwapV1WithdrawSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import {
  accountIdToEvmAddress,
  resolveTokenToEvm,
  tokenEvmAddress,
} from '@/shared/util/token-resolver';

import { SaucerSwapV1WithdrawInputSchema } from './input';

export const SAUCERSWAP_V1_WITHDRAW_COMMAND_NAME = 'saucerswap-v1_withdraw';

export class SaucerSwapV1WithdrawCommand extends BaseTransactionCommand<
  SaucerSwapV1WithdrawNormalizedParams,
  SaucerSwapV1WithdrawBuildTransactionResult,
  SaucerSwapV1WithdrawSignTransactionResult,
  SaucerSwapV1WithdrawExecuteTransactionResult
> {
  constructor() {
    super(SAUCERSWAP_V1_WITHDRAW_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1WithdrawNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1WithdrawInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const aIsHbar = isHbar(validArgs.tokenA, config.whbarTokenId);
    const bIsHbar = isHbar(validArgs.tokenB, config.whbarTokenId);
    if (aIsHbar && bIsHbar) {
      throw new ValidationError('Both tokens cannot be HBAR');
    }

    const whbar = tokenEvmAddress(config.whbarTokenId);
    const tokenAEvm = aIsHbar
      ? whbar
      : resolveTokenToEvm(api, validArgs.tokenA, network, config.whbarTokenId)
          .evmAddress;
    const tokenBEvm = bIsHbar
      ? whbar
      : resolveTokenToEvm(api, validArgs.tokenB, network, config.whbarTokenId)
          .evmAddress;

    const operator = api.network.getCurrentOperatorOrThrow();
    const recipient = accountIdToEvmAddress(operator.accountId);

    return {
      config,
      hbarSide: aIsHbar ? 'A' : bIsHbar ? 'B' : null,
      tokenAEvm,
      tokenBEvm,
      liquidity: BigInt(validArgs.liquidity),
      minAmountA: BigInt(validArgs.minAmountA ?? '0'),
      minAmountB: BigInt(validArgs.minAmountB ?? '0'),
      recipientEvmAddress: recipient,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV1WithdrawNormalizedParams,
  ): Promise<SaucerSwapV1WithdrawBuildTransactionResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);

    if (params.hbarSide === null) {
      const functionParameters = new ContractFunctionParameters()
        .addAddress(params.tokenAEvm)
        .addAddress(params.tokenBEvm)
        .addUint256(toBigNumber(params.liquidity))
        .addUint256(toBigNumber(params.minAmountA))
        .addUint256(toBigNumber(params.minAmountB))
        .addAddress(params.recipientEvmAddress)
        .addUint256(deadline);

      const result = api.contract.contractExecuteTransaction({
        contractId: params.config.routerContractId,
        gas: params.gas,
        functionName: 'removeLiquidity',
        functionParameters,
      });
      return { transaction: result.transaction };
    }

    const tokenEvm =
      params.hbarSide === 'A' ? params.tokenBEvm : params.tokenAEvm;
    const tokenMin =
      params.hbarSide === 'A' ? params.minAmountB : params.minAmountA;
    const hbarMin =
      params.hbarSide === 'A' ? params.minAmountA : params.minAmountB;

    const functionParameters = new ContractFunctionParameters()
      .addAddress(tokenEvm)
      .addUint256(toBigNumber(params.liquidity))
      .addUint256(toBigNumber(tokenMin))
      .addUint256(toBigNumber(hbarMin))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = api.contract.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'removeLiquidityETH',
      functionParameters,
    });
    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1WithdrawNormalizedParams,
    build: SaucerSwapV1WithdrawBuildTransactionResult,
  ): Promise<SaucerSwapV1WithdrawSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1WithdrawNormalizedParams,
    _build: SaucerSwapV1WithdrawBuildTransactionResult,
    sign: SaucerSwapV1WithdrawSignTransactionResult,
  ): Promise<SaucerSwapV1WithdrawExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V1 withdraw failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV1WithdrawNormalizedParams,
    _build: SaucerSwapV1WithdrawBuildTransactionResult,
    _sign: SaucerSwapV1WithdrawSignTransactionResult,
    execute: SaucerSwapV1WithdrawExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV1WithdrawOutput = {
      contractId: params.config.routerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      liquidity: params.liquidity.toString(),
      minAmountA: params.minAmountA.toString(),
      minAmountB: params.minAmountB.toString(),
    };
    return { result: outputData };
  }
}

export async function saucerswapV1Withdraw(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1WithdrawCommand().execute(args);
}
