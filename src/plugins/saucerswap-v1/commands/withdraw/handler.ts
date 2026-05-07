import type {
  CommandHandlerArgs,
  CommandResult,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV1WithdrawOutput } from './output';
import type {
  SaucerSwapV1WithdrawBuildTransactionResult,
  SaucerSwapV1WithdrawExecuteTransactionResult,
  SaucerSwapV1WithdrawNormalizedHbarParams,
  SaucerSwapV1WithdrawNormalizedParams,
  SaucerSwapV1WithdrawNormalizedTokenParams,
  SaucerSwapV1WithdrawSignTransactionResult,
} from './types';

import {
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { ContractFunctionParameters } from '@hiero-ledger/sdk';

import {
  getSaucerSwapV1Config,
  LP_TOKEN_DISPLAY_DECIMALS,
} from '@/plugins/saucerswap-v1/constants';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV1WithdrawInputSchema } from './input';

export const SAUCERSWAP_V1_WITHDRAW_COMMAND_NAME = 'saucerswap-v1_withdraw';

export class SaucerSwapV1WithdrawCommand extends BaseTransactionCommand<
  SaucerSwapV1WithdrawNormalizedParams,
  SaucerSwapV1WithdrawBuildTransactionResult,
  SaucerSwapV1WithdrawSignTransactionResult,
  SaucerSwapV1WithdrawExecuteTransactionResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;

  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V1_WITHDRAW_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1WithdrawNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1WithdrawInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const [resolvedA, resolvedB] = await Promise.all([
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
    const tokenInfoA = resolvedA.tokenInfo;
    const tokenInfoB = resolvedB.tokenInfo;
    const aIsHbar = resolvedA.isHbar;
    const bIsHbar = resolvedB.isHbar;
    if (aIsHbar && bIsHbar) {
      throw new ValidationError('Both tokens cannot be HBAR');
    }

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

    const tokenAEvm = tokenEvmAddress(tokenInfoA.token_id);
    const tokenBEvm = tokenEvmAddress(tokenInfoB.token_id);

    const resolveMinAmount = (
      amount: string | undefined,
      decimals: string,
    ): bigint =>
      amount === undefined
        ? 0n
        : processTokenBalanceInput(
            amount,
            isRawUnits(amount) ? 0 : parseInt(decimals, 10) || 0,
          );

    const liquidity = processTokenBalanceInput(
      validArgs.liquidity,
      isRawUnits(validArgs.liquidity) ? 0 : LP_TOKEN_DISPLAY_DECIMALS,
    );
    const minAmountA = resolveMinAmount(
      validArgs.minAmountA,
      tokenInfoA.decimals,
    );
    const minAmountB = resolveMinAmount(
      validArgs.minAmountB,
      tokenInfoB.decimals,
    );

    const common = {
      config,
      liquidity,
      recipientEvmAddress: recipient,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };

    if (aIsHbar || bIsHbar) {
      return {
        ...common,
        isHbar: true,
        tokenEvm: aIsHbar ? tokenBEvm : tokenAEvm,
        tokenMin: aIsHbar ? minAmountB : minAmountA,
        hbarMin: aIsHbar ? minAmountA : minAmountB,
      };
    }

    return {
      ...common,
      isHbar: false,
      tokenAEvm,
      tokenBEvm,
      minAmountA,
      minAmountB,
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
  return new SaucerSwapV1WithdrawCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
