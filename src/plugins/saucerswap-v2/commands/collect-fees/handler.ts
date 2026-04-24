import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import {
  BaseTransactionCommand,
  TransactionError,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV2CollectFeesOutput } from './output';
import type {
  SaucerSwapV2CollectFeesBuildResult,
  SaucerSwapV2CollectFeesExecuteResult,
  SaucerSwapV2CollectFeesNormalizedParams,
  SaucerSwapV2CollectFeesSignResult,
} from './types';

import { ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';

import { NFT_POSITION_MANAGER_ABI } from '@/plugins/saucerswap-v2/abi/nft-position-manager';
import {
  getSaucerSwapV2Config,
  MAX_UINT128,
} from '@/plugins/saucerswap-v2/constants';
import { encodeContractCall } from '@/plugins/saucerswap-v2/utils/abi-encoder';
import { encodeMulticall } from '@/plugins/saucerswap-v2/utils/multicall';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';

import { SaucerSwapV2CollectFeesInputSchema } from './input';

export const SAUCERSWAP_V2_COLLECT_FEES_COMMAND_NAME =
  'saucerswap-v2_collect-fees';

export class SaucerSwapV2CollectFeesCommand extends BaseTransactionCommand<
  SaucerSwapV2CollectFeesNormalizedParams,
  SaucerSwapV2CollectFeesBuildResult,
  SaucerSwapV2CollectFeesSignResult,
  SaucerSwapV2CollectFeesExecuteResult
> {
  private readonly saucerSwapHelper: SaucerSwapHelperService;

  constructor(saucerSwapHelper: SaucerSwapHelperService) {
    super(SAUCERSWAP_V2_COLLECT_FEES_COMMAND_NAME);
    this.saucerSwapHelper = saucerSwapHelper;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SaucerSwapV2CollectFeesNormalizedParams> {
    const { api } = args;
    const validArgs = SaucerSwapV2CollectFeesInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const recipientAccount = await this.saucerSwapHelper.resolveRecipient();
    const recipient = recipientAccount.evmAddress!;

    return {
      config,
      tokenSN: BigInt(validArgs.position),
      recipientEvmAddress: recipient,
      unwrapHbar: validArgs.unwrapHbar,
      gas: validArgs.gas,
      network,
    };
  }

  async buildTransaction(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2CollectFeesNormalizedParams,
  ): Promise<SaucerSwapV2CollectFeesBuildResult> {
    const collectEncoded = encodeContractCall(
      NFT_POSITION_MANAGER_ABI,
      'collect',
      [
        {
          tokenSN: params.tokenSN,
          recipient: params.recipientEvmAddress,
          amount0Max: MAX_UINT128,
          amount1Max: MAX_UINT128,
        },
      ],
    );

    const calls: Uint8Array[] = [collectEncoded];
    if (params.unwrapHbar) {
      const unwrapEncoded = encodeContractCall(
        NFT_POSITION_MANAGER_ABI,
        'unwrapWHBAR',
        [0n, params.recipientEvmAddress],
      );
      calls.push(unwrapEncoded);
    }

    const functionParameters =
      calls.length === 1
        ? calls[0]
        : encodeMulticall(NFT_POSITION_MANAGER_ABI, calls);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.config.nftManagerContractId))
      .setGas(params.gas)
      .setFunctionParameters(functionParameters);

    return { transaction: tx };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2CollectFeesNormalizedParams,
    build: SaucerSwapV2CollectFeesBuildResult,
  ): Promise<SaucerSwapV2CollectFeesSignResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(build.transaction, []);
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _params: SaucerSwapV2CollectFeesNormalizedParams,
    _build: SaucerSwapV2CollectFeesBuildResult,
    sign: SaucerSwapV2CollectFeesSignResult,
  ): Promise<SaucerSwapV2CollectFeesExecuteResult> {
    const { api } = args;
    const result = await api.txExecute.execute(sign.signedTransaction);
    if (!result.success) {
      throw new TransactionError(
        `SaucerSwap V2 collect-fees failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }
    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    params: SaucerSwapV2CollectFeesNormalizedParams,
    _build: SaucerSwapV2CollectFeesBuildResult,
    _sign: SaucerSwapV2CollectFeesSignResult,
    execute: SaucerSwapV2CollectFeesExecuteResult,
  ): Promise<CommandResult> {
    const outputData: SaucerSwapV2CollectFeesOutput = {
      contractId: params.config.nftManagerContractId,
      network: params.network,
      transactionId: execute.transactionResult.transactionId,
      tokenSN: params.tokenSN.toString(),
      unwrapHbar: params.unwrapHbar,
    };
    return { result: outputData };
  }
}

export async function saucerswapV2CollectFees(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2CollectFeesCommand(
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
