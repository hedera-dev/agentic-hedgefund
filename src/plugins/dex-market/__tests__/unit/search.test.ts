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

    const result = await marketSearch(
      args,
      dexScreener as unknown as DexScreenerService,
    );

    expect(dexScreener.search).toHaveBeenCalledWith('SAUCE');

    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.returnedCount).toBe(2);
    expect(output.query).toBe('SAUCE');
  });

  test('custom limit returns requested number of results', async () => {
    const dexScreener = {
      search: jest.fn().mockResolvedValue([fixtureSaucePair, fixtureHbarPair]),
    };
    const args = makeMarketCommandArgs({
      args: { query: 'SAUCE', limit: 1 },
    });

    const result = await marketSearch(
      args,
      dexScreener as unknown as DexScreenerService,
    );
    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.limit).toBe(1);
    expect(output.totalCount).toBe(2);
    expect(output.returnedCount).toBe(1);
  });

  test('empty results → returns empty array without throwing', async () => {
    const dexScreener = {
      search: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { query: 'XYZUNKNOWN' },
    });

    const result = await marketSearch(
      args,
      dexScreener as unknown as DexScreenerService,
    );
    const output = assertOutput(result.result, MarketSearchOutputSchema);
    expect(output.pairs).toEqual([]);
    expect(output.totalCount).toBe(0);
    expect(output.returnedCount).toBe(0);
  });
});
