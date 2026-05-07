import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerPair } from '@/plugins/dex-market/services/dex-screener-types';
import type { MarketPriceOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressResolverService } from '@/plugins/dex-market/utils/token-id-resolver';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';
import { TokenAddressResolver as DefaultTokenAddressResolver } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

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

  return findTopLiquidityPair(tokenPairs);
}

export class MarketPriceCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenResolver: TokenAddressResolverService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPriceInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddresses = await Promise.all(
      validArgs.token.map((token) =>
        this.tokenResolver.resolveToEvmAddress(token, network),
      ),
    );
    const pairs = await this.dexScreener.getTokens(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      evmAddresses,
    );

    const items = validArgs.token.map((input, index) => {
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
        context: { inputs: validArgs.token },
      });
    }

    const outputData: MarketPriceOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      chain: DEX_SCREENER_HEDERA_CHAIN_ID,
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
  tokenResolver?: TokenAddressResolverService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  const resolver = tokenResolver ?? new DefaultTokenAddressResolver();
  return new MarketPriceCommand(dexScreener, resolver).execute(args);
}
