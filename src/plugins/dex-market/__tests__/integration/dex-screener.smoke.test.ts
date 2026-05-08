import { DexScreenerPairSchema } from '@/plugins/dex-market/services/dex-screener-schemas';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { makeLogger } from '@/plugins/dex-market/__tests__/helpers/mocks';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { SAUCE_EVM_ADDRESS } from '@/plugins/dex-market/__tests__/helpers/fixtures';

const RUN = process.env.HCLI_MARKET_INTEGRATION === '1';
const d = RUN ? describe : describe.skip;

d('DexScreener live API smoke', () => {
  const service = new DexScreenerServiceImpl(makeLogger());

  test('GET /tokens/v1/hedera/{SAUCE} returns parseable response', async () => {
    const tokens = await service.getTokens(DEX_SCREENER_HEDERA_CHAIN_ID, [
      SAUCE_EVM_ADDRESS,
    ]);
    expect(tokens.length).toBeGreaterThan(0);
    expect(DexScreenerPairSchema.safeParse(tokens[0]).success).toBe(true);
  });

  test('GET /token-pairs/v1/hedera/{SAUCE} returns parseable array', async () => {
    const pairs = await service.getTokenPairs(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      SAUCE_EVM_ADDRESS,
    );
    expect(pairs.length).toBeGreaterThan(0);
    expect(DexScreenerPairSchema.safeParse(pairs[0]).success).toBe(true);
  });

  test('GET /latest/dex/pairs/hedera/{pair} returns parseable response', async () => {
    const pairs = await service.getTokenPairs(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      SAUCE_EVM_ADDRESS,
    );
    const pair = await service.getPair(
      DEX_SCREENER_HEDERA_CHAIN_ID,
      pairs[0].pairAddress,
    );
    expect(pair.pairAddress).toBe(pairs[0].pairAddress);
  });

  test('GET /latest/dex/search?q=SAUCE returns hedera results', async () => {
    const results = await service.search('SAUCE');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chainId).toBe(DEX_SCREENER_HEDERA_CHAIN_ID);
  });
});
