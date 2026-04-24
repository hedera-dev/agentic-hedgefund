import type {
  CommandHandlerArgs,
  CommandResult,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV1DepositOutput } from './output';
import type {
  SaucerSwapV1DepositBuildTransactionResult,
  SaucerSwapV1DepositExecuteTransactionResult,
  SaucerSwapV1DepositNormalizedHbarParams,
  SaucerSwapV1DepositNormalizedParams,
  SaucerSwapV1DepositNormalizedTokenParams,
  SaucerSwapV1DepositSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { computeMinOutput } from '@/shared/util/slippage';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV1DepositInputSchema } from './input';

export const SAUCERSWAP_V1_DEPOSIT_COMMAND_NAME = 'saucerswap-v1_deposit';

export class SaucerSwapV1DepositCommand extends BaseTransactionCommand<
  SaucerSwapV1DepositNormalizedParams,
  SaucerSwapV1DepositBuildTransactionResult,
  SaucerSwapV1DepositSignTransactionResult,
  SaucerSwapV1DepositExecuteTransactionResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;

  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V1_DEPOSIT_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1DepositNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1DepositInputSchema.parse(args.args);
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

    const resolveAmount = (amount: string, decimals: string) =>
      processTokenBalanceInput(
        amount,
        isRawUnits(amount) ? 0 : parseInt(decimals, 10) || 0,
      );

    const amountA = resolveAmount(validArgs.amountA, tokenInfoA.decimals);
    const amountB = resolveAmount(validArgs.amountB, tokenInfoB.decimals);
    const slippagePct = validArgs.slippage;

    const common = {
      config,
      recipientEvmAddress: recipient,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };

    // Minimums are computed as desiredAmount * (1 - slippage) for each side
    // independently. This guards against adverse price movement during the tx
    // (the router will revert if the actual transferred amount falls below either
    // floor), but it does NOT prevent depositing at a skewed ratio if the pool
    // has drifted since the user quoted. UniswapV2's addLiquidity always deposits
    // at the current pool ratio; if that ratio has shifted significantly, one
    // side will be much smaller than desired and the other fully consumed.
    // For tighter protection, callers should query getReserves() on the pair
    // first, compute the ratio-adjusted amounts, and apply slippage to those.
    if (aIsHbar || bIsHbar) {
      const [tokenEvm, hbarEvm, tokenAmount, hbarAmount] = aIsHbar
        ? [tokenBEvm, tokenAEvm, amountB, amountA]
        : [tokenAEvm, tokenBEvm, amountA, amountB];
      return {
        ...common,
        isHbar: true,
        tokenEvm,
        hbarEvm,
        tokenAmount,
        hbarAmount,
        tokenMin: computeMinOutput(tokenAmount, slippagePct),
        hbarMin: computeMinOutput(hbarAmount, slippagePct),
      };
    }

    return {
      ...common,
      isHbar: false,
      tokenAEvm,
      tokenBEvm,
      amountA,
      amountB,
      amountAMin: computeMinOutput(amountA, slippagePct),
      amountBMin: computeMinOutput(amountB, slippagePct),
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV1DepositNormalizedParams,
  ): Promise<SaucerSwapV1DepositBuildTransactionResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);
    if (!params.isHbar) {
      return this.buildAddLiquidityTransaction(api.contract, params, deadline);
    }
    return this.buildAddLiquidityEthTransaction(api.contract, params, deadline);
  }

  private buildAddLiquidityTransaction(
    contractService: ContractTransactionService,
    params: SaucerSwapV1DepositNormalizedTokenParams,
    deadline: ReturnType<typeof computeDeadline>,
  ): SaucerSwapV1DepositBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addAddress(params.tokenAEvm)
      .addAddress(params.tokenBEvm)
      .addUint256(toBigNumber(params.amountA))
      .addUint256(toBigNumber(params.amountB))
      .addUint256(toBigNumber(params.amountAMin))
      .addUint256(toBigNumber(params.amountBMin))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'addLiquidity',
      functionParameters,
    });
    return { transaction: result.transaction };
  }

  private buildAddLiquidityEthTransaction(
    contractService: ContractTransactionService,
    params: SaucerSwapV1DepositNormalizedHbarParams,
    deadline: ReturnType<typeof computeDeadline>,
  ): SaucerSwapV1DepositBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addAddress(params.tokenEvm)
      .addUint256(toBigNumber(params.tokenAmount))
      .addUint256(toBigNumber(params.tokenMin))
      .addUint256(toBigNumber(params.hbarMin))
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'addLiquidityETH',
      functionParameters,
      payableAmountTinybars: String(params.hbarAmount),
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
    };
    return { result: outputData };
  }
}

export async function saucerswapV1Deposit(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1DepositCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
