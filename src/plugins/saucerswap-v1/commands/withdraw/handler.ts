import type {
  CommandHandlerArgs,
  CommandResult,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1WithdrawOutput } from './output';
import type {
  SaucerSwapV1WithdrawBuildTransactionResult,
  SaucerSwapV1WithdrawExecuteTransactionResult,
  SaucerSwapV1WithdrawNormalizedHbarParams,
  SaucerSwapV1WithdrawNormalizedParams,
  SaucerSwapV1WithdrawNormalizedTokenParams,
  SaucerSwapV1WithdrawSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';
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
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV1WithdrawInputSchema } from './input';

const LP_TOKEN_DISPLAY_DECIMALS = 8;

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

    let liqDecimals = 0;
    if (!isRawUnits(validArgs.liquidity)) {
      liqDecimals = LP_TOKEN_DISPLAY_DECIMALS;
    }
    const liquidity = processTokenBalanceInput(
      validArgs.liquidity,
      liqDecimals,
    );

    let minAmountA = 0n;
    if (validArgs.minAmountA !== undefined) {
      let d = 0;
      if (!isRawUnits(validArgs.minAmountA)) {
        d = parseInt(tokenInfoA.decimals, 10) || 0;
      }
      minAmountA = processTokenBalanceInput(validArgs.minAmountA, d);
    }

    let minAmountB = 0n;
    if (validArgs.minAmountB !== undefined) {
      let d = 0;
      if (!isRawUnits(validArgs.minAmountB)) {
        d = parseInt(tokenInfoB.decimals, 10) || 0;
      }
      minAmountB = processTokenBalanceInput(validArgs.minAmountB, d);
    }

    const operator = api.network.getCurrentOperatorOrThrow();
    const operatorMirrorInfo = await api.mirror.getAccount(operator.accountId);
    if (!operatorMirrorInfo || !operatorMirrorInfo.evmAddress) {
      throw new ValidationError(
        `Couldn't resolve operator account to evm address`,
      );
    }
    const recipient = operatorMirrorInfo.evmAddress;

    if (aIsHbar) {
      return {
        config,
        isHbar: true,
        tokenEvm: tokenBEvm,
        liquidity,
        tokenMin: minAmountB,
        hbarMin: minAmountA,
        recipientEvmAddress: recipient,
        deadlineSeconds: validArgs.deadline,
        gas: validArgs.gas,
        network,
      };
    } else if (bIsHbar) {
      return {
        config,
        isHbar: true,
        tokenEvm: tokenAEvm,
        liquidity,
        tokenMin: minAmountA,
        hbarMin: minAmountB,
        recipientEvmAddress: recipient,
        deadlineSeconds: validArgs.deadline,
        gas: validArgs.gas,
        network,
      };
    }

    return {
      config,
      isHbar: false,
      tokenAEvm,
      tokenBEvm,
      liquidity,
      minAmountA,
      minAmountB,
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
    const deadline = computeDeadline(params.deadlineSeconds);
    if (!params.isHbar) {
      return this.buildRemoveLiquidityTransaction(
        args.api.contract,
        params,
        deadline,
      );
    }
    return this.buildRemoveLiquidityEthTransaction(
      args.api.contract,
      params,
      deadline,
    );
  }

  private buildRemoveLiquidityTransaction(
    contractService: ContractTransactionService,
    params: SaucerSwapV1WithdrawNormalizedTokenParams,
    deadline: ReturnType<typeof computeDeadline>,
  ): SaucerSwapV1WithdrawBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addAddress(params.tokenAEvm)
      .addAddress(params.tokenBEvm)
      .addUint256(toBigNumber(params.liquidity))
      .addUint256(toBigNumber(params.minAmountA))
      .addUint256(toBigNumber(params.minAmountB))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'removeLiquidity',
      functionParameters,
    });
    return { transaction: result.transaction };
  }

  private buildRemoveLiquidityEthTransaction(
    contractService: ContractTransactionService,
    params: SaucerSwapV1WithdrawNormalizedHbarParams,
    deadline: ReturnType<typeof computeDeadline>,
  ): SaucerSwapV1WithdrawBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addAddress(params.tokenEvm)
      .addUint256(toBigNumber(params.liquidity))
      .addUint256(toBigNumber(params.tokenMin))
      .addUint256(toBigNumber(params.hbarMin))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
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
    };
    return { result: outputData };
  }
}

export async function saucerswapV1Withdraw(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1WithdrawCommand().execute(args);
}
