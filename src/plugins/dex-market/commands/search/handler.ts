import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerPair } from '@/plugins/dex-market/services/dex-screener-types';
import type { MarketSearchOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

import { MarketSearchInputSchema } from './input';

const MAX_SEARCH_RESULTS = 20;

export class MarketSearchCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketSearchInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const results = await this.dexScreener.search(validArgs.query);

    const sorted = results
      .sort((a: DexScreenerPair, b: DexScreenerPair) => {
        const aLiq = a.liquidity?.usd ?? 0;
        const bLiq = b.liquidity?.usd ?? 0;
        return bLiq - aLiq;
      })
      .slice(0, validArgs.all ? undefined : MAX_SEARCH_RESULTS);

    const pairs = sorted.map((p) => ({
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
      chain: 'hedera',
      query: validArgs.query,
      all: validArgs.all,
      pairs,
      totalCount: pairs.length,
    };

    return { result: outputData };
  }
}

export async function marketSearch(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketSearchCommand(dexScreener).execute(args);
}
