import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2BuyOutput } from './output';
import type {
  SaucerSwapV2BuyBuildResult,
  SaucerSwapV2BuyExecuteResult,
  SaucerSwapV2BuyNormalizedParams,
  SaucerSwapV2BuySignResult,
} from './types';

import {
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  HbarUnit,
} from '@hashgraph/sdk';
import {
  AliasType,
  BaseTransactionCommand,
  TransactionError,
} from '@hiero-ledger/hiero-cli';

import { SWAP_ROUTER_ABI } from '@/plugins/saucerswap-v2/abi/swap-router';
import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { encodePathReversed } from '@/plugins/saucerswap-v2/utils/path-encoder';
import { toBigNumber } from '@/shared/util/bignum';
import { computeDeadline } from '@/shared/util/deadline';
import { isHbar } from '@/shared/util/hbar-detection';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import {
  accountIdToEvmAddress,
  tokenEvmAddress,
} from '@/shared/util/token-resolver';

import { SaucerSwapV2BuyInputSchema } from './input';

export const SAUCERSWAP_V2_BUY_COMMAND_NAME = 'saucerswap-v2_buy';

export class SaucerSwapV2BuyCommand extends BaseTransactionCommand<
  SaucerSwapV2BuyNormalizedParams,
  SaucerSwapV2BuyBuildResult,
  SaucerSwapV2BuySignResult,
  SaucerSwapV2BuyExecuteResult
> {
  constructor() {
    super(SAUCERSWAP_V2_BUY_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2BuyNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2BuyInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const whbar = tokenEvmAddress(config.whbarTokenId);
    const fromIsHbar = isHbar(validArgs.from.value, config.whbarTokenId);

    const fromTokenId = fromIsHbar
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.from.value,
          referenceType: validArgs.from.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const toTokenId = isHbar(validArgs.to.value, config.whbarTokenId)
      ? config.whbarTokenId
      : api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.to.value,
          referenceType: validArgs.to.type,
          network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;

    const [fromInfo, toInfo] = await Promise.all([
      api.mirror.getTokenInfo(fromTokenId),
      api.mirror.getTokenInfo(toTokenId),
    ]);

    const fromEvm = fromIsHbar ? whbar : tokenEvmAddress(fromInfo.token_id);
    const toEvm = isHbar(validArgs.to.value, config.whbarTokenId)
      ? whbar
      : tokenEvmAddress(toInfo.token_id);

    const pathReversed = encodePathReversed(
      [fromEvm, toEvm],
      [validArgs.feeTier],
    );

    const operator = api.network.getCurrentOperatorOrThrow();
    const recipient = accountIdToEvmAddress(operator.accountId);

    let toDecimals = 0;
    if (!isRawUnits(validArgs.amount)) {
      toDecimals = parseInt(toInfo.decimals) || 0;
    }
    const amountOut = processTokenBalanceInput(validArgs.amount, toDecimals);

    let fromDecimals = 0;
    if (!isRawUnits(validArgs.maxInput)) {
      fromDecimals = parseInt(fromInfo.decimals) || 0;
    }
    const amountInMax = processTokenBalanceInput(
      validArgs.maxInput,
      fromDecimals,
    );

    return {
      config,
      pathReversed,
      recipientEvmAddress: recipient,
      amountOut,
      amountInMax,
      fromIsHbar,
      feeTier: validArgs.feeTier,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2BuyNormalizedParams,
  ): Promise<SaucerSwapV2BuyBuildResult> {
    const deadline = computeDeadline(params.deadlineSeconds);

    const swapParams = {
      path: params.pathReversed,
      recipient: params.recipientEvmAddress,
      deadline,
      amountOut: params.amountOut,
      amountInMaximum: params.amountInMax,
    };

    const swapEncoded = encodeContractCall(SWAP_ROUTER_ABI, 'exactOutput', [
      swapParams,
    ]);

    let functionParameters: Uint8Array;
    if (params.fromIsHbar) {
      const refundEncoded = encodeContractCall(
        SWAP_ROUTER_ABI,
        'refundETH',
        [],
      );
      functionParameters = encodeMulticall(SWAP_ROUTER_ABI, [
        swapEncoded,
        refundEncoded,
      ]);
    } else {
      functionParameters = swapEncoded;
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.config.swapRouterContractId))
      .setGas(params.gas)
      .setFunctionParameters(functionParameters);

    if (params.fromIsHbar) {
      tx.setPayableAmount(
        Hbar.from(toBigNumber(params.amountInMax), HbarUnit.Tinybar),
      );
    }

    return { transaction: tx };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2BuyNormalizedParams,
    build: SaucerSwapV2BuyBuildResult,
  ): Promise<SaucerSwapV2BuySignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2BuyNormalizedParams,
    _build: SaucerSwapV2BuyBuildResult,
    sign: SaucerSwapV2BuySignResult,
  ): Promise<SaucerSwapV2BuyExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 buy failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2BuyNormalizedParams,
    _build: SaucerSwapV2BuyBuildResult,
    _sign: SaucerSwapV2BuySignResult,
    execute: SaucerSwapV2BuyExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2BuyOutput = {
      contractId: params.config.swapRouterContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      amountOut: params.amountOut.toString(),
      amountInMax: params.amountInMax.toString(),
      feeTier: params.feeTier,
    };
    return { result: outputData };
  }
}

export async function saucerswapV2Buy(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2BuyCommand().execute(args);
}
