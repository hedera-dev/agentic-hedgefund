import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketQuoteOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { resolveToEvmAddress } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

import { MarketQuoteInputSchema } from './input';

function computeWarningLevel(slippagePct: number): 'low' | 'medium' | 'high' {
  if (slippagePct < 1) return 'low';
  if (slippagePct <= 5) return 'medium';
  return 'high';
}

export class MarketQuoteCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketQuoteInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = resolveToEvmAddress(validArgs.token);
    const pairs = await this.dexScreener.getTokenPairs('hedera', evmAddress);

    if (pairs.length === 0) {
      throw new NotFoundError(
        `No liquidity data for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

    const topPool = pairs.reduce((best, current) => {
      const bestLiq = best.liquidity?.usd ?? 0;
      const currentLiq = current.liquidity?.usd ?? 0;
      return currentLiq > bestLiq ? current : best;
    });

    const liquidityUsd = topPool.liquidity?.usd;
    if (liquidityUsd === undefined) {
      throw new NotFoundError(
        `No liquidity data for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

    const sizeUsd = validArgs.size;

    // Constant product (Uniswap V2 x*y=k) approximation; not a router-grade quote.
    const estimatedSlippagePct = (sizeUsd / (liquidityUsd + sizeUsd)) * 100;

    const warningLevel = computeWarningLevel(estimatedSlippagePct);

    const outputData: MarketQuoteOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      tokenInput: validArgs.token,
      evmAddress,
      sizeUsd,
      sizeUsdFormatted: formatNumber(sizeUsd) ?? '0',
      topPool: {
        pairAddress: topPool.pairAddress,
        dexId: topPool.dexId,
        liquidityUsd,
        liquidityUsdFormatted: formatNumber(liquidityUsd) ?? '0',
        priceUsd: topPool.priceUsd,
      },
      estimatedSlippagePct,
      warningLevel,
      formula: 'sizeUsd / (liquidityUsd + sizeUsd) (constant product approx)',
    };

    return { result: outputData };
  }
}

export async function marketQuote(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketQuoteCommand(dexScreener).execute(args);
}
