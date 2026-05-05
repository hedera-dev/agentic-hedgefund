import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketLiquidityOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { NotFoundError, StateError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { resolveToEvmAddress } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

import { MarketLiquidityInputSchema } from './input';

export class MarketLiquidityCommand implements Command {
  constructor(private readonly dexScreener: DexScreenerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketLiquidityInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = resolveToEvmAddress(validArgs.token);
    const pairs = await this.dexScreener.getTokenPairs('hedera', evmAddress);

    if (pairs.length === 0) {
      throw new NotFoundError(
        `No liquidity data found for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

    const totalLiquidityUsd = pairs.reduce(
      (sum, p) => sum + (p.liquidity?.usd ?? 0),
      0,
    );

    const topPool = pairs.reduce((best, current) => {
      const bestLiq = best.liquidity?.usd ?? 0;
      const currentLiq = current.liquidity?.usd ?? 0;
      return currentLiq > bestLiq ? current : best;
    });

    const hasHealthyLiquidity = totalLiquidityUsd >= validArgs.minUsd;

    const outputData: MarketLiquidityOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      tokenInput: validArgs.token,
      evmAddress,
      totalLiquidityUsd,
      totalLiquidityUsdFormatted: formatNumber(totalLiquidityUsd) ?? '0',
      poolCount: pairs.length,
      topPool: {
        pairAddress: topPool.pairAddress,
        dexId: topPool.dexId,
        liquidityUsd: topPool.liquidity?.usd,
        liquidityUsdFormatted: formatNumber(topPool.liquidity?.usd),
        priceUsd: topPool.priceUsd,
      },
      threshold: validArgs.minUsd,
      thresholdFormatted: formatNumber(validArgs.minUsd) ?? '0',
      hasHealthyLiquidity,
    };

    if (!hasHealthyLiquidity) {
      throw new StateError(
        `Liquidity below threshold ($${totalLiquidityUsd} < $${validArgs.minUsd})`,
        { context: { output: outputData } },
      );
    }

    return { result: outputData };
  }
}

export async function marketLiquidity(
  args: CommandHandlerArgs,
  dexScreenerService?: DexScreenerService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  return new MarketLiquidityCommand(dexScreener).execute(args);
}
