import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import {
  BaseTransactionCommand,
  TransactionError,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV2SwapOutput } from './output';
import type {
  SaucerSwapV2SwapBuildResult,
  SaucerSwapV2SwapExecuteResult,
  SaucerSwapV2SwapNormalizedParams,
  SaucerSwapV2SwapSignResult,
} from './types';

import { SWAP_ROUTER_ABI } from '@/plugins/saucerswap-v2/abi/swap-router';
import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { encodePath } from '@/plugins/saucerswap-v2/utils/path-encoder';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';
import { computeDeadline } from '@/shared/util/deadline';
import { computeMinOutput } from '@/shared/util/slippage';
import {
  isRawUnits,
  processTokenBalanceInput,
} from '@/shared/util/token-balance-input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

import { SaucerSwapV2SwapInputSchema } from './input';

export const SAUCERSWAP_V2_SWAP_COMMAND_NAME = 'saucerswap-v2_swap';

export class SaucerSwapV2SwapCommand extends BaseTransactionCommand<
  SaucerSwapV2SwapNormalizedParams,
  SaucerSwapV2SwapBuildResult,
  SaucerSwapV2SwapSignResult,
  SaucerSwapV2SwapExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;
  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_SWAP_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2SwapNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2SwapInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

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
    const toIsHbar = toToken.isHbar;
    const fromInfo = fromToken.tokenInfo;
    const toInfo = toToken.tokenInfo;

    const fromEvm = tokenEvmAddress(fromInfo.token_id);
    const toEvm = tokenEvmAddress(toInfo.token_id);

    const path = encodePath([fromEvm, toEvm], [validArgs.feeTier]);

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

    let fromDecimals = 0;
    if (!isRawUnits(validArgs.amount)) {
      fromDecimals = parseInt(fromInfo.decimals, 10) || 0;
    }
    const amountIn = processTokenBalanceInput(validArgs.amount, fromDecimals);

    let amountOutMin: bigint;
    if (validArgs.minOutput !== undefined) {
      let toDec = 0;
      if (!isRawUnits(validArgs.minOutput)) {
        toDec = parseInt(toInfo.decimals, 10) || 0;
      }
      amountOutMin = processTokenBalanceInput(validArgs.minOutput, toDec);
    } else {
      amountOutMin = computeMinOutput(amountIn, validArgs.slippage);
    }

    return {
      config,
      path,
      recipientEvmAddress: recipient,
      amountIn,
      amountOutMin,
      fromIsHbar,
      toIsHbar,
      feeTier: validArgs.feeTier,
      deadlineSeconds: validArgs.deadline,
      gas: validArgs.gas,
      keyRefIds: [],
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    params: SaucerSwapV2SwapNormalizedParams,
  ): Promise<SaucerSwapV2SwapBuildResult> {
    const { api } = args;
    const deadline = computeDeadline(params.deadlineSeconds);

    const swapParams = {
      path: params.path,
      recipient: params.recipientEvmAddress,
      deadline,
      amountIn: params.amountIn,
      amountOutMinimum: params.amountOutMin,
    };

    const swapEncoded = encodeContractCall(SWAP_ROUTER_ABI, 'exactInput', [
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
      payableAmountTinybars: String(params.amountIn),
      functionParametersEncoded: functionParameters,
    });

    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2SwapNormalizedParams,
    build: SaucerSwapV2SwapBuildResult,
  ): Promise<SaucerSwapV2SwapSignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2SwapNormalizedParams,
    _build: SaucerSwapV2SwapBuildResult,
    sign: SaucerSwapV2SwapSignResult,
  ): Promise<SaucerSwapV2SwapExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 swap failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2SwapNormalizedParams,
    _build: SaucerSwapV2SwapBuildResult,
    _sign: SaucerSwapV2SwapSignResult,
    execute: SaucerSwapV2SwapExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2SwapOutput = {
      contractId: params.config.swapRouterContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      amountIn: params.amountIn.toString(),
      amountOutMin: params.amountOutMin.toString(),
      feeTier: params.feeTier,
    };
    return { result: outputData };
  }
}

export async function saucerswapV2Swap(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2SwapCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
