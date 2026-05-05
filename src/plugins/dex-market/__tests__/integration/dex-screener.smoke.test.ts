import { DexScreenerPairSchema } from '@/plugins/dex-market/services/dex-screener-schemas';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import { makeLogger } from '@/plugins/dex-market/__tests__/helpers/mocks';

const RUN = process.env.HCLI_MARKET_INTEGRATION === '1';
const d = RUN ? describe : describe.skip;

d('DexScreener live API smoke', () => {
  const service = new DexScreenerServiceImpl(makeLogger());
  const SAUCE_EVM = '0x00000000000000000000000000000000000b2ad5';

  test('GET /tokens/v1/hedera/{SAUCE} returns parseable response', async () => {
    const tokens = await service.getTokens('hedera', [SAUCE_EVM]);
    expect(tokens.length).toBeGreaterThan(0);
    expect(DexScreenerPairSchema.safeParse(tokens[0]).success).toBe(true);
  });

  test('GET /token-pairs/v1/hedera/{SAUCE} returns parseable array', async () => {
    const pairs = await service.getTokenPairs('hedera', SAUCE_EVM);
    expect(pairs.length).toBeGreaterThan(0);
    expect(DexScreenerPairSchema.safeParse(pairs[0]).success).toBe(true);
  });

  test('GET /latest/dex/pairs/hedera/{pair} returns parseable response', async () => {
    const pairs = await service.getTokenPairs('hedera', SAUCE_EVM);
    const pair = await service.getPair('hedera', pairs[0].pairAddress);
    expect(pair.pairAddress).toBe(pairs[0].pairAddress);
  });

  test('GET /latest/dex/search?q=SAUCE returns hedera results', async () => {
    const results = await service.search('SAUCE');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chainId).toBe('hedera');
  });
});
