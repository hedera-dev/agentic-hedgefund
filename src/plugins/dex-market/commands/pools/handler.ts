import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';
import type { MarketPoolsOutput } from './output';

import { NotFoundError, SupportedNetwork } from '@hiero-ledger/hiero-cli';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { sortByLiquidityDesc } from '@/plugins/dex-market/utils/pairs';

import { MarketPoolsInputSchema } from './input';

export class MarketPoolsCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenAddress: TokenAddressService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPoolsInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = await this.tokenAddress.resolveEvmAddress(
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
): Promise<CommandResult> {
  const dexScreener = new DexScreenerServiceImpl(args.logger);
  const tokenAddress = new TokenAddressServiceImpl(args.api.mirror);
  return new MarketPoolsCommand(dexScreener, tokenAddress).execute(args);
}
