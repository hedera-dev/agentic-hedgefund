import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError, StateError } from '@hiero-ledger/hiero-cli';
import {
  fixtureSaucePair,
  fixtureSaucePairV2,
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
  UNKNOWN_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import {
  makeMarketCommandArgs,
  makeTokenAddressResolver,
} from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketLiquidity,
  MarketLiquidityInputSchema,
  MarketLiquidityOutputSchema,
} from '@/plugins/dex-market/commands/liquidity';

describe('market liquidity', () => {
  test('healthy liquidity → success', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, minUsd: 1000 },
    });

    const result = await marketLiquidity(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );

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
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, minUsd: 1000 },
    });

    await expect(
      marketLiquidity(
        args,
        dexScreener as unknown as DexScreenerService,
        tokenResolver,
      ),
    ).rejects.toThrow(StateError);
  });

  test('uses default liquidity threshold', () => {
    const parsed = MarketLiquidityInputSchema.parse({ token: SAUCE_TOKEN_ID });
    expect(parsed.minUsd).toBe(10_000);
  });

  test('no pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: UNKNOWN_TOKEN_ID },
    });

    await expect(
      marketLiquidity(
        args,
        dexScreener as unknown as DexScreenerService,
        tokenResolver,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
