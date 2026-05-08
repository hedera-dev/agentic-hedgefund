import type { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { NotFoundError } from '@hiero-ledger/hiero-cli';

import { fixtureSaucePair } from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import {
  MarketPairCommand,
  MarketPairOutputSchema,
} from '@/plugins/dex-market/commands/pair';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

describe('market pair', () => {
  test('returns pair details', async () => {
    const dexScreener = {
      getPair: jest.fn().mockResolvedValue(fixtureSaucePair),
    };
    const args = makeMarketCommandArgs({
      args: { pair: '0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6' },
    });

    const result = await new MarketPairCommand(
      dexScreener as unknown as DexScreenerService,
    ).execute(args);

    expect(dexScreener.getPair).toHaveBeenCalledWith(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      '0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6',
    );

    const output = assertOutput(result.result, MarketPairOutputSchema);
    expect(output.pairAddress).toBe(fixtureSaucePair.pairAddress);
    expect(output.dexId).toBe('saucerswap');
  });

  test('missing pair → NotFoundError', async () => {
    const dexScreener = {
      getPair: jest.fn().mockRejectedValue(new NotFoundError('Pair not found')),
    };
    const args = makeMarketCommandArgs({
      args: { pair: '0x0000000000000000000000000000000000000000' },
    });

    await expect(
      new MarketPairCommand(
        dexScreener as unknown as DexScreenerService,
      ).execute(args),
    ).rejects.toThrow(NotFoundError);
  });
});
