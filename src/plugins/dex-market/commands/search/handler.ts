import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { MarketSearchOutput } from './output';

import { SupportedNetwork } from '@hiero-ledger/hiero-cli';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { sortByLiquidityDesc } from '@/plugins/dex-market/utils/pairs';

import { MarketSearchInputSchema } from './input';

export class MarketSearchCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketSearchInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const results = await this.dexScreener.search(validArgs.query);

    const sorted = sortByLiquidityDesc(results);
    const displayPairs = sorted.slice(0, validArgs.limit);

    const pairs = displayPairs.map((p) => ({
      pairAddress: p.pairAddress,
      dexId: p.dexId,
      baseToken: p.baseToken,
      quoteToken: p.quoteToken,
      priceUsd: p.priceUsd,
      liquidityUsd: p.liquidity?.usd,
      liquidityUsdFormatted: formatNumber(p.liquidity?.usd),
      volumeH24: p.volume.h24,
      volumeH24Formatted: formatNumber(p.volume.h24) ?? '0',
    }));

    const outputData: MarketSearchOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      chain: DEX_SCREENER_HEDERA_CHAIN_ID,
      query: validArgs.query,
      limit: validArgs.limit,
      pairs,
      totalCount: sorted.length,
      returnedCount: pairs.length,
    };

    return { result: outputData };
  }
}

export async function marketSearch(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const dexScreener = new DexScreenerServiceImpl(args.api.logger);
  return new MarketSearchCommand(dexScreener).execute(args);
}
