import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';
import type { MarketLiquidityOutput } from './output';

import {
  NotFoundError,
  StateError,
  SupportedNetwork,
} from '@hiero-ledger/hiero-cli';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';

import { MarketLiquidityInputSchema } from './input';

export class MarketLiquidityCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenAddress: TokenAddressService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketLiquidityInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const resolvedToken = await this.tokenAddress.resolveTokenAddress(
      validArgs.token,
      network,
    );
    const pairs = await this.dexScreener.getTokenPairs(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      resolvedToken.evmAddress,
    );

    if (pairs.length === 0) {
      throw new NotFoundError(
        `No liquidity data found for token ${validArgs.token}`,
        { context: { token: validArgs.token, ...resolvedToken } },
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
        { context: { token: validArgs.token, ...resolvedToken } },
      );
    }

    const hasHealthyLiquidity = totalLiquidityUsd >= validArgs.minUsd;

    const outputData: MarketLiquidityOutput = {
      network,
      networkMismatchWarning: network !== SupportedNetwork.MAINNET,
      tokenInput: validArgs.token,
      tokenId: resolvedToken.tokenId,
      evmAddress: resolvedToken.evmAddress,
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
): Promise<CommandResult> {
  const dexScreener = new DexScreenerServiceImpl(args.api.logger);
  const tokenAddress = new TokenAddressServiceImpl(args.api.mirror);
  return new MarketLiquidityCommand(dexScreener, tokenAddress).execute(args);
}
