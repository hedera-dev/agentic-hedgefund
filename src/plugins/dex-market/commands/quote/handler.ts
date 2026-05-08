import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';
import type { MarketQuoteOutput } from './output';

import { NotFoundError, SupportedNetwork } from '@hiero-ledger/hiero-cli';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';
import { formatNumber } from '@/plugins/dex-market/utils/format-number';
import { findTopLiquidityPair } from '@/plugins/dex-market/utils/pairs';

import { MarketQuoteInputSchema } from './input';

export class MarketQuoteCommand implements Command {
  constructor(
    private readonly dexScreener: DexScreenerService,
    private readonly tokenAddress: TokenAddressService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = MarketQuoteInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const evmAddress = await this.tokenAddress.resolveEvmAddress(
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

    const topPool = findTopLiquidityPair(pairs);
    if (!topPool) {
      throw new NotFoundError(
        `No liquidity data for token ${validArgs.token}`,
        { context: { token: validArgs.token, evmAddress } },
      );
    }

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

    const warningLevel = this.computeWarningLevel(estimatedSlippagePct);

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

  private computeWarningLevel(slippagePct: number): 'low' | 'medium' | 'high' {
    if (slippagePct < 1) return 'low';
    if (slippagePct <= 5) return 'medium';
    return 'high';
  }
}

export async function marketQuote(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const dexScreener = new DexScreenerServiceImpl(args.logger);
  const tokenAddress = new TokenAddressServiceImpl(args.api.mirror);
  return new MarketQuoteCommand(dexScreener, tokenAddress).execute(args);
}
