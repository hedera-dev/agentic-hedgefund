import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1DepositOutput } from './output';
import type {
  SaucerSwapV1DepositBuildTransactionResult,
  SaucerSwapV1DepositExecuteTransactionResult,
  SaucerSwapV1DepositNormalizedParams,
  SaucerSwapV1DepositSignTransactionResult,
} from './types';

import { ContractFunctionParameters, Hbar, HbarUnit } from '@hashgraph/sdk';
import {
  AliasType,
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import { computeMinOutput } from '@/shared/util/slippage';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-resolver';

import { SaucerSwapV1DepositInputSchema } from './input';

export const SAUCERSWAP_V1_DEPOSIT_COMMAND_NAME = 'saucerswap-v1_deposit';

export class SaucerSwapV1DepositCommand extends BaseTransactionCommand<
  SaucerSwapV1DepositNormalizedParams,
  SaucerSwapV1DepositBuildTransactionResult,
  SaucerSwapV1DepositSignTransactionResult,
  SaucerSwapV1DepositExecuteTransactionResult
> {
  constructor() {
    super(SAUCERSWAP_V1_DEPOSIT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1DepositNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1DepositInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const aIsHbar = isHbar(validArgs.tokenA.value, config.whbarTokenId);
    const bIsHbar = isHbar(validArgs.tokenB.value, config.whbarTokenId);
    if (aIsHbar && bIsHbar) {
      throw new ValidationError('Both tokens cannot be HBAR');
    }

    const fromTokenIdA = aIsHbar
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.tokenA.value,
          referenceType: validArgs.tokenA.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const tokenInfoA = await api.mirror.getTokenInfo(fromTokenIdA);

    const fromTokenIdB = bIsHbar
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.tokenB.value,
          referenceType: validArgs.tokenB.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const tokenInfoB = await api.mirror.getTokenInfo(fromTokenIdB);

    const tokenAEvm = tokenEvmAddress(tokenInfoA.token_id);
    const tokenBEvm = tokenEvmAddress(tokenInfoB.token_id);

    let decA = 0;
    if (!isRawUnits(validArgs.amountA)) {
      decA = parseInt(tokenInfoA.decimals, 10) || 0;
    }
    const amountA = processTokenBalanceInput(validArgs.amountA, decA);

    let decB = 0;
    if (!isRawUnits(validArgs.amountB)) {
      decB = parseInt(tokenInfoB.decimals, 10) || 0;
    }
    const amountB = processTokenBalanceInput(validArgs.amountB, decB);

    const operator = api.network.getCurrentOperatorOrThrow();
    const operatorMirrorInfo = await api.mirror.getAccount(operator.accountId);
    if (!operatorMirrorInfo || !operatorMirrorInfo.evmAddress) {
      throw new ValidationError(
        `Couldn't resolve operator account to evm address`,
      );
    }
    const recipient = operatorMirrorInfo.evmAddress;

    const hbarSide: 'A' | 'B' | null = aIsHbar ? 'A' : bIsHbar ? 'B' : null;
    const slippagePct = validArgs.slippage;

    return {
      config,
      hbarSide,
      tokenAEvm,
      tokenBEvm,
      amountA,
      amountB,
      amountAMin: computeMinOutput(amountA, slippagePct),
      amountBMin: computeMinOutput(amountB, slippagePct),
      recipientEvmAddress: recipient,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV1DepositNormalizedParams,
  ): Promise<SaucerSwapV1DepositBuildTransactionResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);

    if (params.hbarSide === null) {
      const functionParameters = new ContractFunctionParameters()
        .addAddress(params.tokenAEvm)
        .addAddress(params.tokenBEvm)
        .addUint256(toBigNumber(params.amountA))
        .addUint256(toBigNumber(params.amountB))
        .addUint256(toBigNumber(params.amountAMin))
        .addUint256(toBigNumber(params.amountBMin))
        .addAddress(params.recipientEvmAddress)
        .addUint256(deadline);

      const result = api.contract.contractExecuteTransaction({
        contractId: params.config.routerContractId,
        gas: params.gas,
        functionName: 'addLiquidity',
        functionParameters,
      });
      return { transaction: result.transaction };
    }

    const tokenEvm =
      params.hbarSide === 'A' ? params.tokenBEvm : params.tokenAEvm;
    const tokenDesired =
      params.hbarSide === 'A' ? params.amountB : params.amountA;
    const tokenMin =
      params.hbarSide === 'A' ? params.amountBMin : params.amountAMin;
    const hbarAmount =
      params.hbarSide === 'A' ? params.amountA : params.amountB;
    const hbarMin =
      params.hbarSide === 'A' ? params.amountAMin : params.amountBMin;
    console.log(tokenDesired);
    console.log(tokenMin);
    console.log(hbarMin);

    const functionParameters = new ContractFunctionParameters()
      .addAddress(tokenEvm)
      .addUint256(toBigNumber(tokenDesired))
      .addUint256(toBigNumber(tokenMin))
      .addUint256(toBigNumber(hbarMin))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = api.contract.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'addLiquidityETH',
      functionParameters,
      payableAmount: hbarAmount,
    });
    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1DepositNormalizedParams,
    build: SaucerSwapV1DepositBuildTransactionResult,
  ): Promise<SaucerSwapV1DepositSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1DepositNormalizedParams,
    _build: SaucerSwapV1DepositBuildTransactionResult,
    sign: SaucerSwapV1DepositSignTransactionResult,
  ): Promise<SaucerSwapV1DepositExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V1 deposit failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV1DepositNormalizedParams,
    _build: SaucerSwapV1DepositBuildTransactionResult,
    _sign: SaucerSwapV1DepositSignTransactionResult,
    execute: SaucerSwapV1DepositExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV1DepositOutput = {
      contractId: params.config.routerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      amountA: params.amountA.toString(),
      amountB: params.amountB.toString(),
      amountAMin: params.amountAMin.toString(),
      amountBMin: params.amountBMin.toString(),
    };
    return { result: outputData };
  }
}

export async function saucerswapV1Deposit(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1DepositCommand().execute(args);
}
