import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';
import type { TokenAddressService } from '@/plugins/dex-market/services/token-address.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';

import {
  fixtureSaucePair,
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
  MarketQuoteCommand,
  MarketQuoteOutputSchema,
} from '@/plugins/dex-market/commands/quote';

describe('market quote', () => {
  test('low slippage for small size', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([fixtureSaucePair]),
    };
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, size: 100 },
    });

    const result = await new MarketQuoteCommand(
      dexScreener as unknown as DexScreenerService,
      tokenAddress as unknown as TokenAddressService,
    ).execute(args);

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
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: SAUCE_TOKEN_ID, size: 1_000_000 },
    });

    const result = await new MarketQuoteCommand(
      dexScreener as unknown as DexScreenerService,
      tokenAddress as unknown as TokenAddressService,
    ).execute(args);

    const output = assertOutput(result.result, MarketQuoteOutputSchema);
    expect(output.warningLevel).toBe('high');
    expect(output.estimatedSlippagePct).toBeGreaterThan(5);
  });

  test('no pools → NotFoundError', async () => {
    const dexScreener = {
      getTokenPairs: jest.fn().mockResolvedValue([]),
    };
    const tokenAddress = makeTokenAddressService(SAUCE_EVM_ADDRESS);
    const args = makeMarketCommandArgs({
      args: { token: UNKNOWN_TOKEN_ID, size: 100 },
    });

    await expect(
      new MarketQuoteCommand(
        dexScreener as unknown as DexScreenerService,
        tokenAddress as unknown as TokenAddressService,
      ).execute(args),
    ).rejects.toThrow(NotFoundError);
  });
});
