import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { DexScreenerPair } from '@/plugins/dex-market/services/dex-screener-types';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';
import type { MarketPriceOutput } from './output';

import { NotFoundError, SupportedNetwork } from '@hiero-ledger/hiero-cli';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';

import { MarketPriceInputSchema } from './input';

export class MarketPriceCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenAddress: TokenAddressService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPriceInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const resolvedTokens = await Promise.all(
      validArgs.token.map((token) =>
        this.tokenAddress.resolveTokenAddress(token, network),
      ),
    );
    const pairs = await this.dexScreener.getTokens(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      resolvedTokens.map((token) => token.evmAddress),
    );

    const items = validArgs.token.map((input, index) => {
      const resolvedToken = resolvedTokens[index];
      const topPair = this.findTopPairForToken(pairs, resolvedToken.evmAddress);

      if (!topPair) {
        return {
          input,
          tokenId: resolvedToken.tokenId,
          evmAddress: resolvedToken.evmAddress,
          indexed: false,
        };
      }

      return {
        input,
        tokenId: resolvedToken.tokenId,
        evmAddress: resolvedToken.evmAddress,
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

  private findTopPairForToken(
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
}

export async function marketPrice(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const dexScreener = new DexScreenerServiceImpl(args.api.logger);
  const tokenAddress = new TokenAddressServiceImpl(args.api.mirror);
  return new MarketPriceCommand(dexScreener, tokenAddress).execute(args);
}
