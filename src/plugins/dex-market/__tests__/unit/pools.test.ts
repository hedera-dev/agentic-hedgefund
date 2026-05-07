import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import {
  fixtureSaucePair,
  fixtureSaucePairV2,
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
  UNKNOWN_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import {
  makeMarketCommandArgs,
  makeTokenAddressResolver,
} from '@/plugins/dex-market/__tests__/helpers/mocks';
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
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID },
    });

    const result = await marketPools(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );

    expect(dexScreener.getTokenPairs).toHaveBeenCalledWith(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      SAUCE_EVM_ADDRESS,
    );

    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.returnedCount).toBe(2);
    expect(output.pools[0].pairAddress).toBe(fixtureSaucePair.pairAddress);
    expect(output.pools[1].pairAddress).toBe(fixtureSaucePairV2.pairAddress);
  });

  test('custom limit returns requested number of pools', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, limit: 1 },
    });

    const result = await marketPools(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );
    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.limit).toBe(1);
    expect(output.returnedCount).toBe(1);
    expect(output.moreCount).toBe(1);
  });

  test('empty pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: UNKNOWN_TOKEN_ID },
    });

    await expect(
      marketPools(
        args,
        dexScreener as unknown as DexScreenerService,
        tokenResolver,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
