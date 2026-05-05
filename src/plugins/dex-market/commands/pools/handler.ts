import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketPoolsOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { resolveToEvmAddress } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

import { MarketPoolsInputSchema } from './input';

const MAX_DISPLAY_POOLS = 15;

export class MarketPoolsCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketPoolsInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = resolveToEvmAddress(validArgs.token);
    const allPairs = await this.dexScreener.getTokenPairs('hedera', evmAddress);

    if (allPairs.length === 0) {
      throw new NotFoundError(`No pools found for token ${validArgs.token}`, {
        context: { token: validArgs.token, evmAddress },
      });
    }

    const sorted = allPairs.sort((a, b) => {
      const aLiq = a.liquidity?.usd ?? 0;
      const bLiq = b.liquidity?.usd ?? 0;
      return bLiq - aLiq;
    });

    const displayPairs = validArgs.all ? sorted : sorted.slice(0, MAX_DISPLAY_POOLS);

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
      chain: 'hedera',
      tokenInput: validArgs.token,
      evmAddress,
      all: validArgs.all,
      pools,
      totalCount: sorted.length,
      moreCount: validArgs.all ? 0 : Math.max(0, sorted.length - MAX_DISPLAY_POOLS),
    };

    return { result: outputData };
  }
}

export async function marketPools(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketPoolsCommand(dexScreener).execute(args);
}
