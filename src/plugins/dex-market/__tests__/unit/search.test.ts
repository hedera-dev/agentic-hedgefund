import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import {
  fixtureHbarPair,
  fixtureSaucePair,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketSearch,
  MarketSearchOutputSchema,
} from '@/plugins/dex-market/commands/search';

describe('market search', () => {
  test('returns hedera pairs sorted by liquidity', async () => {
    const dexScreener = {
      search: jest.fn().mockResolvedValue([fixtureSaucePair, fixtureHbarPair]),
    };
    const args = makeMarketCommandArgs({
      args: { query: 'SAUCE' },
    });

    const result = await marketSearch(args, dexScreener as unknown as DexScreenerService);

    expect(dexScreener.search).toHaveBeenCalledWith('SAUCE');

    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.query).toBe('SAUCE');
    expect(output.all).toBe(false);
  });

  test('--all returns more results when available', async () => {
    const dexScreener = {
      search: jest.fn().mockResolvedValue([fixtureSaucePair, fixtureHbarPair]),
    };
    const args = makeMarketCommandArgs({
      args: { query: 'SAUCE', all: true },
    });

    const result = await marketSearch(args, dexScreener as unknown as DexScreenerService);
    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.all).toBe(true);
  });

  test('empty results → returns empty array without throwing', async () => {
    const dexScreener = {
      search: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { query: 'XYZUNKNOWN' },
    });

    const result = await marketSearch(args, dexScreener as unknown as DexScreenerService);
    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.pairs).toEqual([]);
    expect(output.totalCount).toBe(0);
  });
});
