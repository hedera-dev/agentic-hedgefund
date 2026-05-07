import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketPoolsOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressResolverService } from '@/plugins/dex-market/utils/token-id-resolver';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { sortByLiquidityDesc } from '@/plugins/dex-market/utils/pairs';
import { TokenAddressResolver as DefaultTokenAddressResolver } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

import { MarketPoolsInputSchema } from './input';

export class MarketPoolsCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenResolver: TokenAddressResolverService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPoolsInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = await this.tokenResolver.resolveToEvmAddress(
      validArgs.token,
      network,
    );
    const allPairs = await this.dexScreener.getTokenPairs(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      evmAddress,
    );

    if (allPairs.length === 0) {
      throw new NotFoundError(`No pools found for token ${validArgs.token}`, {
        context: { token: validArgs.token, evmAddress },
      });
    }

    const sorted = sortByLiquidityDesc(allPairs);

    const displayPairs = sorted.slice(0, validArgs.limit);

    const pools = displayPairs.map((p) => ({
      pairAddress: p.pairAddress,
      dexId: p.dexId,
      baseToken: {
        symbol: p.baseToken.symbol,
        address: p.baseToken.address,
      },
      quoteToken: {
        symbol: p.quoteToken.symbol,
        address: p.quoteToken.address,
      },
      liquidityUsd: p.liquidity?.usd,
      liquidityUsdFormatted: formatNumber(p.liquidity?.usd),
      volumeH24: p.volume.h24,
      volumeH24Formatted: formatNumber(p.volume.h24) ?? '0',
      priceUsd: p.priceUsd,
      priceNative: p.priceNative,
      url: p.url,
    }));

    const outputData: MarketPoolsOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      chain: DEX_SCREENER_HEDERA_CHAIN_ID,
      tokenInput: validArgs.token,
      evmAddress,
      limit: validArgs.limit,
      pools,
      totalCount: sorted.length,
      returnedCount: pools.length,
      moreCount: Math.max(0, sorted.length - pools.length),
    };

    return { result: outputData };
  }
}

export async function marketPools(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
  tokenResolver?: TokenAddressResolverService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  const resolver = tokenResolver ?? new DefaultTokenAddressResolver();
  return new MarketPoolsCommand(dexScreener, resolver).execute(args);
}
