import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerPair } from '@/plugins/dex-market/services/dex-screener-types';
import type { MarketPriceOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { resolveToEvmAddress } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

import { MarketPriceInputSchema } from './input';

function findTopPairForToken(
  pairs: DexScreenerPair[],
  evmAddress: string,
): DexScreenerPair | undefined {
  const tokenPairs = pairs.filter(
    (p) =>
      p.baseToken.address.toLowerCase() === evmAddress ||
      p.quoteToken.address.toLowerCase() === evmAddress,
  );

  if (tokenPairs.length === 0) {
    return undefined;
  }

  return tokenPairs.reduce((best, current) => {
    const bestLiq = best.liquidity?.usd ?? 0;
    const currentLiq = current.liquidity?.usd ?? 0;
    return currentLiq > bestLiq ? current : best;
  });
}

export class MarketPriceCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPriceInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddresses = validArgs.tokens.map(resolveToEvmAddress);
    const pairs = await this.dexScreener.getTokens('hedera', evmAddresses);

    const items = validArgs.tokens.map((input, index) => {
      const evmAddress = evmAddresses[index];
      const topPair = findTopPairForToken(pairs, evmAddress);

      if (!topPair) {
        return {
          input,
          evmAddress,
          indexed: false,
        };
      }

      return {
        input,
        evmAddress,
        symbol: topPair.baseToken.symbol,
        name: topPair.baseToken.name,
        indexed: true,
        priceUsd: topPair.priceUsd,
        priceNative: topPair.priceNative,
        liquidityUsd: topPair.liquidity?.usd,
        liquidityUsdFormatted: formatNumber(topPair.liquidity?.usd),
        topPair: {
          pairAddress: topPair.pairAddress,
          dexId: topPair.dexId,
          quoteSymbol: topPair.quoteToken.symbol,
        },
        priceChangeM5: topPair.priceChange?.m5,
        priceChangeH1: topPair.priceChange?.h1,
        priceChangeH6: topPair.priceChange?.h6,
        priceChangeH24: topPair.priceChange?.h24,
      };
    });

    const indexedCount = items.filter((i) => i.indexed).length;

    if (indexedCount === 0) {
      throw new NotFoundError('No market data found for provided tokens', {
        context: { inputs: validArgs.tokens },
      });
    }

    const outputData: MarketPriceOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      chain: 'hedera',
      tokens: items,
      totalCount: items.length,
      indexedCount,
      notFound: items.filter((i) => !i.indexed).map((i) => i.input),
    };

    return { result: outputData };
  }
}

export async function marketPrice(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketPriceCommand(dexScreener).execute(args);
}
