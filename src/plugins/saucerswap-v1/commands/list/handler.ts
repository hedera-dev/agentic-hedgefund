import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapApiService } from '@/shared/services/saucerswap-api/saucerswap-api-service.interface';
import type { SaucerSwapV1ListOutput } from './output';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { SaucerSwapApiServiceImpl } from '@/shared/services/saucerswap-api/saucerswap-api-service';

import { SaucerSwapV1ListInputSchema } from './input';

export class SaucerSwapV1ListCommand implements Command {
  constructor(private readonly saucerSwapApi: SaucerSwapApiService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV1ListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const pools = await this.saucerSwapApi.fetchAllPools(config.apiBaseUrl);

    const filtered = validArgs.token
      ? pools.filter((p) => matchesTokenFilter(p, validArgs.token!))
      : pools;

    const outputData: SaucerSwapV1ListOutput = {
      network,
      poolCount: filtered.length,
      pools: filtered.map((p) => ({
        id: p.id,
        contractId: p.contractId,
        tokenA: `${p.tokenA.symbol} (${p.tokenA.id})`,
        tokenB: `${p.tokenB.symbol} (${p.tokenB.id})`,
        reserveA: p.tokenReserveA,
        reserveB: p.tokenReserveB,
      })),
    };
    return { result: outputData };
  }
}

function matchesTokenFilter(
  pool: {
    tokenA: { id: string; symbol: string; name: string };
    tokenB: { id: string; symbol: string; name: string };
  },
  filter: string,
): boolean {
  const normalized = filter.toUpperCase();
  const candidates = [
    pool.tokenA.id,
    pool.tokenB.id,
    pool.tokenA.symbol.toUpperCase(),
    pool.tokenB.symbol.toUpperCase(),
  ];
  if (candidates.includes(normalized) || candidates.includes(filter))
    return true;
  return (
    pool.tokenA.name.toUpperCase().includes(normalized) ||
    pool.tokenB.name.toUpperCase().includes(normalized)
  );
}

export async function saucerswapV1List(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1ListCommand(new SaucerSwapApiServiceImpl()).execute(
    args,
  );
}
