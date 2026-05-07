import { DexScreenerService } from '@/plugins/dex-market/services/dex-screener.service.interface';

import { assertOutput } from '@/plugins/dex-market/__tests__/utils/assert-output';
import { NotFoundError } from '@hiero-ledger/hiero-cli';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { fixtureSaucePair } from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeMarketCommandArgs } from '@/plugins/dex-market/__tests__/helpers/mocks';
import {
  marketPair,
  MarketPairOutputSchema,
} from '@/plugins/dex-market/commands/pair';

describe('market pair', () => {
  test('returns pair details', async () => {
    const dexScreener = {
      getPair: jest.fn().mockResolvedValue(fixtureSaucePair),
    };
    const args = makeMarketCommandArgs({
      args: { pair: '0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6' },
    });

    const result = await marketPair(
      args,
      dexScreener as unknown as DexScreenerService,
    );

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
      marketPair(args, dexScreener as unknown as DexScreenerService),
    ).rejects.toThrow(NotFoundError);
  });
});
