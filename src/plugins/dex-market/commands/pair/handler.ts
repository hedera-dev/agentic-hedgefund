import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketPairOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

import { MarketPairInputSchema } from './input';

export class MarketPairCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPairInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const pair = await this.dexScreener.getPair(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      validArgs.pair,
    );

    const outputData: MarketPairOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      chain: DEX_SCREENER_HEDERA_CHAIN_ID,
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      url: pair.url,
      labels: pair.labels,
      baseToken: pair.baseToken,
      quoteToken: pair.quoteToken,
      priceUsd: pair.priceUsd,
      priceNative: pair.priceNative,
      liquidityUsd: pair.liquidity?.usd,
      liquidityUsdFormatted: formatNumber(pair.liquidity?.usd),
      volumeH24: pair.volume.h24,
      volumeH24Formatted: formatNumber(pair.volume.h24) ?? '0',
      txnsH24: pair.txns.h24,
      fdv: pair.fdv,
      marketCap: pair.marketCap,
      pairCreatedAt: pair.pairCreatedAt,
      priceChangeM5: pair.priceChange?.m5,
      priceChangeH1: pair.priceChange?.h1,
      priceChangeH6: pair.priceChange?.h6,
      priceChangeH24: pair.priceChange?.h24,
    };

    return { result: outputData };
  }
}

export async function marketPair(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketPairCommand(dexScreener).execute(args);
}
