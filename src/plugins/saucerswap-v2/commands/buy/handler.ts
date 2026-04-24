import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import {
  BaseTransactionCommand,
  TransactionError,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV2BuyOutput } from './output';
import type {
  SaucerSwapV2BuyBuildResult,
  SaucerSwapV2BuyExecuteResult,
  SaucerSwapV2BuyNormalizedParams,
  SaucerSwapV2BuySignResult,
} from './types';

import { SWAP_ROUTER_ABI } from '@/plugins/saucerswap-v2/abi/swap-router';
import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { encodePathReversed } from '@/plugins/saucerswap-v2/utils/path-encoder';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';
import { computeDeadline } from '@/shared/util/deadline';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV2BuyInputSchema } from './input';

export const SAUCERSWAP_V2_BUY_COMMAND_NAME = 'saucerswap-v2_buy';

export class SaucerSwapV2BuyCommand extends BaseTransactionCommand<
  SaucerSwapV2BuyNormalizedParams,
  SaucerSwapV2BuyBuildResult,
  SaucerSwapV2BuySignResult,
  SaucerSwapV2BuyExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;
  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_BUY_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2BuyNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2BuyInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const whbar = tokenEvmAddress(config.whbarTokenId);

    const [fromToken, toToken] = await Promise.all([
      this.saucerSwapHelper.resolveToken({
        value: validArgs.from.value,
        type: validArgs.from.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
      this.saucerSwapHelper.resolveToken({
        value: validArgs.to.value,
        type: validArgs.to.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
    ]);
    const fromIsHbar = fromToken.isHbar;
    const fromInfo = fromToken.tokenInfo;
    const toInfo = toToken.tokenInfo;

    const fromEvm = fromIsHbar ? whbar : tokenEvmAddress(fromInfo.token_id);
    const toEvm = toToken.isHbar ? whbar : tokenEvmAddress(toInfo.token_id);

    const pathReversed = encodePathReversed(
      [fromEvm, toEvm],
      [validArgs.feeTier],
    );

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

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
    args: CommandHandlerArgs,
    params: SaucerSwapV2BuyNormalizedParams,
  ): Promise<SaucerSwapV2BuyBuildResult> {
    const { api } = args;
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

    const result = api.contract.contractExecuteWithEncodedParams({
      contractId: params.config.swapRouterContractId,
      gas: params.gas,
      payableAmountTinybars: String(params.amountInMax),
      functionParametersEncoded: functionParameters,
    });

    return { transaction: result.transaction };
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
  return new SaucerSwapV2BuyCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
