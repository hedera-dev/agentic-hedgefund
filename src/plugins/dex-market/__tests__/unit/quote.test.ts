import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { fixtureSaucePair } from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketQuote,
  MarketQuoteOutputSchema,
} from '@/plugins/dex-market/commands/quote';

describe('market quote', () => {
  test('low slippage for small size', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861', size: 100 },
    });

    const result = await marketQuote(args, dexScreener as unknown as DexScreenerService);

    const output = assertOutput(result.result, MarketQuoteOutputSchema);
    expect(output.warningLevel).toBe('low');
    expect(output.estimatedSlippagePct).toBeLessThan(1);
    expect(output.formula).toBe(
      'sizeUsd / (liquidityUsd + sizeUsd) (constant product approx)',
    );
  });

  test('high slippage for large size', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861', size: 1_000_000 },
    });

    const result = await marketQuote(args, dexScreener as unknown as DexScreenerService);

    const output = assertOutput(result.result, MarketQuoteOutputSchema);
    expect(output.warningLevel).toBe('high');
    expect(output.estimatedSlippagePct).toBeGreaterThan(5);
  });

  test('no pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.999999', size: 100 },
    });

    await expect(marketQuote(args, dexScreener as unknown as DexScreenerService)).rejects.toThrow(NotFoundError);
  });
});
