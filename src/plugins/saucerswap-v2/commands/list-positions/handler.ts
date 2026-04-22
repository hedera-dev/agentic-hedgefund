import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapApiService } from '@/shared/services/saucerswap-api/saucerswap-api-service.interface';
import type { SaucerSwapV2ListPositionsOutput } from './output';

import { AliasType } from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { SaucerSwapApiServiceImpl } from '@/shared/services/saucerswap-api/saucerswap-api-service';

import { SaucerSwapV2ListPositionsInputSchema } from './input';

export class SaucerSwapV2ListPositionsCommand implements Command {
  constructor(private readonly saucerSwapApi: SaucerSwapApiService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV2ListPositionsInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const accountId = validArgs.account
      ? api.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: validArgs.account.value,
          referenceType: validArgs.account.type,
          network,
          aliasType: AliasType.Account,
        }).entityIdOrEvmAddress
      : api.network.getCurrentOperatorOrThrow().accountId;

    const positions = await this.saucerSwapApi.fetchV2Positions(
      config.apiBaseUrl,
      accountId,
      validArgs.apiKey,
    );

    const outputData: SaucerSwapV2ListPositionsOutput = {
      network,
      accountId,
      positionCount: positions.length,
      positions: positions.map((p) => ({
        tokenSN: Number(p.tokenSN),
        feeTier: p.fee ?? null,
        tickLower: p.tickLower ?? null,
        tickUpper: p.tickUpper ?? null,
        liquidity: p.liquidity ?? null,
        tokensOwed0: p.tokensOwed0 ?? null,
        tokensOwed1: p.tokensOwed1 ?? null,
      })),
    };
    return { result: outputData };
  }
}

export async function saucerswapV2ListPositions(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2ListPositionsCommand(
    new SaucerSwapApiServiceImpl(),
  ).execute(args);
}
