import type {
  CommandHandlerArgs,
  CommandResult,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1SwapOutput } from './output';
import type {
  SaucerSwapV1SwapBuildTransactionResult,
  SaucerSwapV1SwapExecuteTransactionResult,
  SaucerSwapV1SwapNormalizedParams,
  SaucerSwapV1SwapSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';
import {
  AliasType,
  BaseTransactionCommand,
  TransactionError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { SaucerSwapV1Helper } from '@/plugins/saucerswap-v1/saucerswap-helper';
import { resolveSwapDirection } from '@/plugins/saucerswap-v1/utils/resolve-swap-direction';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV1SwapInputSchema } from './input';
import { SwapDirection } from './types';

export const SAUCERSWAP_V1_SWAP_COMMAND_NAME = 'saucerswap-v1_swap';

export class SaucerSwapV1SwapCommand extends BaseTransactionCommand<
  SaucerSwapV1SwapNormalizedParams,
  SaucerSwapV1SwapBuildTransactionResult,
  SaucerSwapV1SwapSignTransactionResult,
  SaucerSwapV1SwapExecuteTransactionResult
> {
  private readonly saucerSwapHelper: SaucerSwapV1Helper;
  constructor(saucerSwapHelper: SaucerSwapV1Helper) {
    super(SAUCERSWAP_V1_SWAP_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV1SwapNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV1SwapInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    if (
      isHbar(validArgs.from.value, config.whbarTokenId) &&
      isHbar(validArgs.to.value, config.whbarTokenId)
    ) {
      throw new ValidationError('Both tokens cannot be HBAR');
    }

    const direction = resolveSwapDirection(
      validArgs.from,
      validArgs.to,
      config.whbarTokenId,
    );

    const fromTokenId = isHbar(validArgs.from.value, config.whbarTokenId)
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.from.value,
          referenceType: validArgs.from.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const fromTokenInfo = await api.mirror.getTokenInfo(fromTokenId);
    const toTokenId = isHbar(validArgs.to.value, config.whbarTokenId)
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.to.value,
          referenceType: validArgs.to.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const toTokenInfo = await api.mirror.getTokenInfo(toTokenId);

    const fromEvm = tokenEvmAddress(fromTokenInfo.token_id);
    const toEvm = tokenEvmAddress(toTokenInfo.token_id);

    const operator = api.network.getCurrentOperatorOrThrow();
    const operatorMirrorInfo = await api.mirror.getAccount(operator.accountId);
    if (!operatorMirrorInfo || !operatorMirrorInfo.evmAddress) {
      throw new ValidationError(
        `Couldn't resolve operator account to evm address`,
      );
    }
    const recipient = operatorMirrorInfo.evmAddress;

    let tokenFromDecimals = 0;
    if (!isRawUnits(validArgs.amount)) {
      tokenFromDecimals = parseInt(fromTokenInfo.decimals) || 0;
    }
    const rawAmountIn = processTokenBalanceInput(
      validArgs.amount,
      tokenFromDecimals,
    );
    let amountOutMin: bigint;
    if (validArgs.minOutput) {
      let tokenOutDecimals = 0;
      if (!isRawUnits(validArgs.minOutput)) {
        tokenOutDecimals = parseInt(toTokenInfo.decimals) || 0;
      }
      amountOutMin = processTokenBalanceInput(
        validArgs.minOutput,
        tokenOutDecimals,
      );
    } else {
      amountOutMin = await this.saucerSwapHelper.computeAmountOutMin(
        config.routerContractId,
        rawAmountIn,
        [fromEvm, toEvm],
        validArgs.slippage,
      );
    }

    return {
      config,
      direction,
      path: [fromEvm, toEvm],
      recipientEvmAddress: recipient,
      amountIn: rawAmountIn,
      amountOutMin,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV1SwapNormalizedParams,
  ): Promise<SaucerSwapV1SwapBuildTransactionResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);

    switch (params.direction) {
      case SwapDirection.HBAR_FOR_TOKEN:
        return this.buildHbarForTokenSwap(api.contract, params, deadline);
      case SwapDirection.TOKEN_FOR_HBAR:
        return this.buildTokenForHbarSwap(api.contract, params, deadline);
      case SwapDirection.TOKEN_FOR_TOKEN:
      default:
        return this.buildTokenForTokenSwap(api.contract, params, deadline);
    }
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1SwapNormalizedParams,
    build: SaucerSwapV1SwapBuildTransactionResult,
  ): Promise<SaucerSwapV1SwapSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV1SwapNormalizedParams,
    _build: SaucerSwapV1SwapBuildTransactionResult,
    sign: SaucerSwapV1SwapSignTransactionResult,
  ): Promise<SaucerSwapV1SwapExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V1 swap failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV1SwapNormalizedParams,
    _build: SaucerSwapV1SwapBuildTransactionResult,
    _sign: SaucerSwapV1SwapSignTransactionResult,
    execute: SaucerSwapV1SwapExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV1SwapOutput = {
      contractId: params.config.routerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      direction: params.direction,
      amountIn: params.amountIn.toString(),
      amountOutMin: params.amountOutMin.toString(),
    };
    return { result: outputData };
  }

  buildHbarForTokenSwap(
    contractService: ContractTransactionService,
    params: SaucerSwapV1SwapNormalizedParams,
    deadline: number,
  ): SaucerSwapV1SwapBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountOutMin))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);
    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactETHForTokens',
      functionParameters,
      payableAmountTinybars: String(params.amountIn),
    });
    return { transaction: result.transaction };
  }

  buildTokenForHbarSwap(
    contractService: ContractTransactionService,
    params: SaucerSwapV1SwapNormalizedParams,
    deadline: number,
  ): SaucerSwapV1SwapBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountIn))
      .addUint256(toBigNumber(params.amountOutMin))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);
    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactTokensForETH',
      functionParameters,
    });
    return { transaction: result.transaction };
  }

  buildTokenForTokenSwap(
    contractService: ContractTransactionService,
    params: SaucerSwapV1SwapNormalizedParams,
    deadline: number,
  ): SaucerSwapV1SwapBuildTransactionResult {
    const functionParameters = new ContractFunctionParameters()
      .addUint256(toBigNumber(params.amountIn))
      .addUint256(toBigNumber(params.amountOutMin))
      .addAddressArray(params.path)
      .addAddress(params.recipientEvmAddress)
      .addUint256(deadline);
    const result = contractService.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactTokensForTokens',
      functionParameters,
    });
    return { transaction: result.transaction };
  }
}

export async function saucerswapV1Swap(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1SwapCommand(
    new SaucerSwapV1Helper(args.api.contractQuery, args.api.contract),
  ).execute(args);
}
