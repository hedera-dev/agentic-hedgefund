import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError, StateError } from '@hiero-ledger/hiero-cli';
import {
  fixtureSaucePair,
  fixtureSaucePairV2,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketLiquidity,
  MarketLiquidityOutputSchema,
} from '@/plugins/dex-market/commands/liquidity';

describe('market liquidity', () => {
  test('healthy liquidity → success', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861', minUsd: 1000 },
    });

    const result = await marketLiquidity(args, dexScreener as unknown as DexScreenerService);

    const output = assertOutput(result.result, MarketLiquidityOutputSchema);
    expect(output.hasHealthyLiquidity).toBe(true);
    expect(output.poolCount).toBe(2);
    expect(output.totalLiquidityUsd).toBe(
      fixtureSaucePair.liquidity!.usd! + fixtureSaucePairV2.liquidity!.usd!,
    );
  });

  test('below threshold → StateError', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([
          { ...fixtureSaucePair, liquidity: { usd: 500, base: 1, quote: 1 } },
        ]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.731861', minUsd: 1000 },
    });

    await expect(marketLiquidity(args, dexScreener as unknown as DexScreenerService)).rejects.toThrow(StateError);
  });

  test('no pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const args = makeMarketCommandArgs({
      args: { token: '0.0.999999' },
    });

    await expect(marketLiquidity(args, dexScreener as unknown as DexScreenerService)).rejects.toThrow(NotFoundError);
  });
});
