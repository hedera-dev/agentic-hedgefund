import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import {
  fixtureSaucePair,
  fixtureSaucePairV2,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketPools,
  MarketPoolsOutputSchema,
} from '@/plugins/dex-market/commands/pools';

describe('market pools', () => {
  test('returns pools sorted by liquidity descending', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861' },
    });

    const result = await marketPools(args, dexScreener as unknown as DexScreenerService);

    expect(dexScreener.getTokenPairs).toHaveBeenCalledWith(
      'hedera',
      '0x00000000000000000000000000000000000b2ad5',
    );

    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.all).toBe(false);
    expect(output.pools[0].pairAddress).toBe(fixtureSaucePair.pairAddress);
    expect(output.pools[1].pairAddress).toBe(fixtureSaucePairV2.pairAddress);
  });

  test('--all returns all pools without limit', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861', all: true },
    });

    const result = await marketPools(args, dexScreener as unknown as DexScreenerService);
    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.all).toBe(true);
    expect(output.moreCount).toBe(0);
  });

  test('empty pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.999999' },
    });

    await expect(marketPools(args, dexScreener as unknown as DexScreenerService)).rejects.toThrow(NotFoundError);
  });
});
