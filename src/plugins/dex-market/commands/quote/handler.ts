import type { Command } from '@hiero-ledger/hiero-cli';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { MarketQuoteOutput } from './output';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressResolverService } from '@/plugins/dex-market/utils/token-id-resolver';

import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';
import { TokenAddressResolver as DefaultTokenAddressResolver } from '@/plugins/dex-market/utils/token-id-resolver';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

import { MarketQuoteInputSchema } from './input';

function computeWarningLevel(slippagePct: number): 'low' | 'medium' | 'high' {
  if (slippagePct < 1) return 'low';
  if (slippagePct <= 5) return 'medium';
  return 'high';
}

export class MarketQuoteCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenResolver: TokenAddressResolverService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketQuoteInputSchema.parse(args.args);

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
        `No liquidity data for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

    const topPool = findTopLiquidityPair(pairs)!;

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
  tokenResolver?: TokenAddressResolverService,
): Promise<CommandResult> {
  const dexScreener =
    dexScreenerService ?? new DexScreenerServiceImpl(args.logger);
  const resolver = tokenResolver ?? new DefaultTokenAddressResolver();
  return new MarketQuoteCommand(dexScreener, resolver).execute(args);
}
