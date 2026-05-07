import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import {
  HBAR_TOKEN_ID,
  fixtureSaucePair,
  fixtureSaucePairV2,
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
  UNKNOWN_EVM_ADDRESS,
  UNKNOWN_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import {
  makeMarketCommandArgs,
  makeTokenAddressResolver,
} from '@/plugins/dex-market/__tests__/helpers/mocks';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import {
  marketPrice,
  MarketPriceInputSchema,
  MarketPriceOutputSchema,
} from '@/plugins/dex-market/commands/price';

describe('market price', () => {
  test('returns indexed tokens with top pair', async () => {
    const dexScreener = {
      getTokens: jest
        .fn()
        .mockResolvedValue([fixtureSaucePair, fixtureSaucePairV2]),
    };
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: [SAUCE_TOKEN_ID] },
    });

    const result = await marketPrice(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );

    expect(dexScreener.getTokens).toHaveBeenCalledWith(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      [SAUCE_EVM_ADDRESS],
    );

    const output = assertOutput(result.result, MarketPriceOutputSchema);
    expect(output.indexedCount).toBe(1);
    expect(output.tokens[0].symbol).toBe('SAUCE');
    expect(output.tokens[0].indexed).toBe(true);
  });

  test('unknown token → indexed:false', async () => {
    const dexScreener = {
      getTokens: jest.fn().mockResolvedValue([]),
    };
    const tokenResolver = makeTokenAddressResolver({
      [UNKNOWN_TOKEN_ID]: UNKNOWN_EVM_ADDRESS,
      [SAUCE_TOKEN_ID]: SAUCE_EVM_ADDRESS,
    });
    const args = makeMarketCommandArgs({
      args: { token: [UNKNOWN_TOKEN_ID, SAUCE_TOKEN_ID] },
    });

    await expect(
      marketPrice(
        args,
        dexScreener as unknown as DexScreenerService,
        tokenResolver,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  test('valid + unknown mixed returns partial', async () => {
    const dexScreener = {
      getTokens: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const tokenResolver = makeTokenAddressResolver({
      [UNKNOWN_TOKEN_ID]: UNKNOWN_EVM_ADDRESS,
      [SAUCE_TOKEN_ID]: SAUCE_EVM_ADDRESS,
    });
    const args = makeMarketCommandArgs({
      args: { token: [UNKNOWN_TOKEN_ID, SAUCE_TOKEN_ID] },
    });

    const result = await marketPrice(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );
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
    const tokenResolver = makeTokenAddressResolver(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: [SAUCE_TOKEN_ID, HBAR_TOKEN_ID] },
    });

    const result = await marketPrice(
      args,
      dexScreener as unknown as DexScreenerService,
      tokenResolver,
    );
    const output = assertOutput(result.result, MarketPriceOutputSchema);
    expect(output.totalCount).toBe(2);
  });

  test('rejects empty token input', () => {
    const parsed = MarketPriceInputSchema.safeParse({ token: [''] });
    expect(parsed.success).toBe(false);
  });
});
