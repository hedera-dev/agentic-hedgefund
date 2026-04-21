import type {
  CommandHandlerArgs,
  CommandResult,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1BuyOutput } from './output';
import type {
  SaucerSwapV1BuyBuildTransactionResult,
  SaucerSwapV1BuyExecuteTransactionResult,
  SaucerSwapV1BuyNormalizedParams,
  SaucerSwapV1BuySignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';
import {
  BaseTransactionCommand,
  TransactionError,
} from '@hiero-ledger/hiero-cli';

import { SwapDirection } from '@/plugins/saucerswap-v1/commands/swap/types';
import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { resolveSwapDirection } from '@/plugins/saucerswap-v1/utils/resolve-swap-direction';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import {
  accountIdToEvmAddress,
  resolveTokenToEvm,
  tokenEvmAddress,
} from '@/shared/util/token-resolver';

import { SaucerSwapV1BuyInputSchema } from './input';

export const SAUCERSWAP_V1_BUY_COMMAND_NAME = 'saucerswap-v1_buy';

export class SaucerSwapV1BuyCommand extends BaseTransactionCommand<
  SaucerSwapV1BuyNormalizedParams,
  SaucerSwapV1BuyBuildTransactionResult,
  SaucerSwapV1BuySignTransactionResult,
  SaucerSwapV1BuyExecuteTransactionResult
> {
  constructor() {
    super(SAUCERSWAP_V1_BUY_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1BuyNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1BuyInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const direction = resolveSwapDirection(
      validArgs.from,
      validArgs.to,
      config.whbarTokenId,
    );
    const whbar = tokenEvmAddress(config.whbarTokenId);
    const fromEvm = isHbar(validArgs.from, config.whbarTokenId)
      ? whbar
      : resolveTokenToEvm(api, validArgs.from, network, config.whbarTokenId)
          .evmAddress;
    const toEvm = isHbar(validArgs.to, config.whbarTokenId)
      ? whbar
      : resolveTokenToEvm(api, validArgs.to, network, config.whbarTokenId)
          .evmAddress;

    const operator = api.network.getCurrentOperatorOrThrow();
    const recipient = accountIdToEvmAddress(operator.accountId);

    return {
      config,
      direction,
      path: [fromEvm, toEvm],
      recipientEvmAddress: recipient,
      amountOut: BigInt(validArgs.amount),
      amountInMax: BigInt(validArgs.maxInput),
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV1BuyNormalizedParams,
  ): Promise<SaucerSwapV1BuyBuildTransactionResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);

    switch (params.direction) {
      case SwapDirection.HBAR_FOR_TOKEN:
        return this.buildHbarForTokenBuy(api.contract, params, deadline);
      case SwapDirection.TOKEN_FOR_HBAR:
        return this.buildTokenForHbarBuy(api.contract, params, deadline);
      case SwapDirection.TOKEN_FOR_TOKEN:
      default:
        return this.buildTokenForTokenBuy(api.contract, params, deadline);
    }
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1BuyNormalizedParams,
    build: SaucerSwapV1BuyBuildTransactionResult,
  ): Promise<SaucerSwapV1BuySignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1BuyNormalizedParams,
    _build: SaucerSwapV1BuyBuildTransactionResult,
    sign: SaucerSwapV1BuySignTransactionResult,
  ): Promise<SaucerSwapV1BuyExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V1 buy failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV1BuyNormalizedParams,
    _build: SaucerSwapV1BuyBuildTransactionResult,
    _sign: SaucerSwapV1BuySignTransactionResult,
    execute: SaucerSwapV1BuyExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV1BuyOutput = {
      contractId: params.config.routerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      direction: params.direction,
      amountOut: params.amountOut.toString(),
      amountInMax: params.amountInMax.toString(),
    };
    return { result: outputData };
  }

  buildHbarForTokenBuy(
    contractService: ContractTransactionService,
    params: SaucerSwapV1BuyNormalizedParams,
    deadline: number,
  ): SaucerSwapV1BuyBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountOut))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapETHForExactTokens',
      functionParameters,
      payableAmount: params.amountInMax,
    });
    return { transaction: result.transaction };
  }

  buildTokenForHbarBuy(
    contractService: ContractTransactionService,
    params: SaucerSwapV1BuyNormalizedParams,
    deadline: number,
  ): SaucerSwapV1BuyBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountOut))
      .addUint256(toBigNumber(params.amountInMax))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapTokensForExactETH',
      functionParameters,
    });
    return { transaction: result.transaction };
  }

  buildTokenForTokenBuy(
    contractService: ContractTransactionService,
    params: SaucerSwapV1BuyNormalizedParams,
    deadline: number,
  ): SaucerSwapV1BuyBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountOut))
      .addUint256(toBigNumber(params.amountInMax))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);

    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapTokensForExactTokens',
      functionParameters,
    });
    return { transaction: result.transaction };
  }
}

export async function saucerswapV1Buy(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1BuyCommand().execute(args);
}
