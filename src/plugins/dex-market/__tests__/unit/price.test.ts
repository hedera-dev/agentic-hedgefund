import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import {
  fixtureSaucePair,
  fixtureSaucePairV2,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketPrice,
  MarketPriceOutputSchema,
} from '@/plugins/dex-market/commands/price';

describe('market price', () => {
  test('returns indexed tokens with top pair', async () => {
    const dexScreener = {
      getTokens: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const args = makeMarketCommandArgs({
      args: { tokens: '0.0.731861' },
    });

    const result = await marketPrice(args, dexScreener as unknown as DexScreenerService);

    expect(dexScreener.getTokens).toHaveBeenCalledWith('hedera', [
      '0x00000000000000000000000000000000000b2ad5',
    ]);

    const output = assertOutput(result.result, MarketPriceOutputSchema);
    expect(output.indexedCount).toBe(1);
    expect(output.tokens[0].symbol).toBe('SAUCE');
    expect(output.tokens[0].indexed).toBe(true);
  });

  test('unknown token → indexed:false', async () => {
    const dexScreener = {
      getTokens: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { tokens: '0.0.999999,0.0.731861' },
    });

    await expect(marketPrice(args, dexScreener as unknown as DexScreenerService)).rejects.toThrow(NotFoundError);
  });

  test('valid + unknown mixed returns partial', async () => {
    const dexScreener = {
      getTokens: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const args = makeMarketCommandArgs({
      args: { tokens: '0.0.999999,0.0.731861' },
    });

    const result = await marketPrice(args, dexScreener as unknown as DexScreenerService);
    const output = assertOutput(result.result, MarketPriceOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.indexedCount).toBe(1);
    expect(output.tokens[0].indexed).toBe(false);
    expect(output.tokens[1].indexed).toBe(true);
  });

  test('batch call supports multiple tokens', async () => {
    const dexScreener = {
      getTokens: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const args = makeMarketCommandArgs({
      args: { tokens: '0.0.731861,0.0.456858' },
    });

    const result = await marketPrice(args, dexScreener as unknown as DexScreenerService);
    const output = assertOutput(result.result, MarketPriceOutputSchema);
    expect(output.totalCount).toBe(2);
  });
});
