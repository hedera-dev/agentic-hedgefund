import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';

import {
  fixtureSaucePair,
  fixtureSaucePairV2,
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
  UNKNOWN_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import {
  makeMarketCommandArgs,
  makeTokenAddressService,
} from '@/plugins/dex-market/__tests__/helpers/mocks';
import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import {
  MarketPoolsCommand,
  MarketPoolsOutputSchema,
} from '@/plugins/dex-market/commands/pools';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

describe('market pools', () => {
  test('returns pools sorted by liquidity descending', async () => {
    const dexScreener = {
      getTokenPairs: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID },
    });

    const result = await new MarketPoolsCommand(
      dexScreener as unknown as DexScreenerService,
      tokenAddress as unknown as TokenAddressService,
    ).execute(args);

    expect(dexScreener.getTokenPairs).toHaveBeenCalledWith(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      SAUCE_EVM_ADDRESS,
    );

    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.tokenId).toBe(SAUCE_TOKEN_ID);
    expect(output.evmAddress).toBe(SAUCE_EVM_ADDRESS);
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
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, limit: 1 },
    });

    const result = await new MarketPoolsCommand(
      dexScreener as unknown as DexScreenerService,
      tokenAddress as unknown as TokenAddressService,
    ).execute(args);
    const output = assertOutput(result.result, MarketPoolsOutputSchema);
    expect(output.limit).toBe(1);
    expect(output.returnedCount).toBe(1);
    expect(output.moreCount).toBe(1);
  });

  test('empty pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: UNKNOWN_TOKEN_ID },
    });

    await expect(
      new MarketPoolsCommand(
        dexScreener as unknown as DexScreenerService,
        tokenAddress as unknown as TokenAddressService,
      ).execute(args),
    ).rejects.toThrow(NotFoundError);
  });
});
