import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapApiService } from '@/shared/services/saucerswap-api/saucerswap-api-service.interface';
import type { SaucerSwapV2ListPoolsOutput } from './output';

import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { SaucerSwapApiServiceImpl } from '@/shared/services/saucerswap-api/saucerswap-api-service';

import { SaucerSwapV2ListPoolsInputSchema } from './input';

export class SaucerSwapV2ListPoolsCommand implements Command {
  constructor(private readonly saucerSwapApi: SaucerSwapApiService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV2ListPoolsInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const pools = await this.saucerSwapApi.fetchV2Pools(
      config.apiBaseUrl,
      validArgs.apiKey,
    );

    const filtered = pools.filter((p) => {
      if (
        validArgs.feeTier !== undefined &&
        Number(p.fee) !== validArgs.feeTier
      ) {
        return false;
      }
      if (!validArgs.token) return true;
      const norm = validArgs.token.toUpperCase();
      return (
        p.tokenA.id === validArgs.token ||
        p.tokenB.id === validArgs.token ||
        p.tokenA.symbol.toUpperCase() === norm ||
        p.tokenB.symbol.toUpperCase() === norm
      );
    });

    const outputData: SaucerSwapV2ListPoolsOutput = {
      network,
      poolCount: filtered.length,
      pools: filtered.map((p) => ({
        contractId: p.contractId,
        tokenA: `${p.tokenA.symbol} (${p.tokenA.id})`,
        tokenB: `${p.tokenB.symbol} (${p.tokenB.id})`,
        feeTier: Number(p.fee),
      })),
    };
    return { result: outputData };
  }
}

export async function saucerswapV2ListPools(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2ListPoolsCommand(
    new SaucerSwapApiServiceImpl(),
  ).execute(args);
}
