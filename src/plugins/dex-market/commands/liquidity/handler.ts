import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketLiquidityOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressResolverService } from '@/plugins/dex-market/utils/token-id-resolver';

import { NotFoundError, StateError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';
import { TokenAddressResolver as DefaultTokenAddressResolver } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

import { MarketLiquidityInputSchema } from './input';

export class MarketLiquidityCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenResolver: TokenAddressResolverService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketLiquidityInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = await this.tokenResolver.resolveToEvmAddress(
      validArgs.token,
      network,
    );
    const pairs = await this.dexScreener.getTokenPairs(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      evmAddress,
    );

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

    const topPool = findTopLiquidityPair(pairs);
    if (!topPool) {
      throw new NotFoundError(
        `No liquidity data found for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

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
  tokenResolver?: TokenAddressResolverService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  const resolver = tokenResolver ?? new DefaultTokenAddressResolver();
  return new MarketLiquidityCommand(dexScreener, resolver).execute(args);
}
