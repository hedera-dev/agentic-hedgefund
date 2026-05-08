import { z } from 'zod';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerTokenInfoSchema } from '@/plugins/dex-market/services/dex-screener-schemas';

export const MarketSearchOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  chain: z.literal(DEX_SCREENER_HEDERA_CHAIN_ID),
  query: z.string(),
  limit: z.number().int().positive(),
  pairs: z.array(
    z.object({
      pairAddress: z.string(),
      dexId: z.string(),
      baseToken: DexScreenerTokenInfoSchema,
      quoteToken: DexScreenerTokenInfoSchema,
      priceUsd: z.string().optional(),
      liquidityUsd: z.number().optional(),
      liquidityUsdFormatted: z.string().optional(),
      volumeH24: z.number(),
      volumeH24Formatted: z.string(),
    }),
  ),
  totalCount: z.number().int().nonnegative(),
  returnedCount: z.number().int().nonnegative(),
});

export type MarketSearchOutput = z.infer<typeof MarketSearchOutputSchema>;

export const MARKET_SEARCH_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

🔍 Search: "{{query}}"
Chain: {{chain}}
Results: {{totalCount}}
Returned: {{returnedCount}}
{{#each pairs}}
{{add1 @index}}. {{baseToken.symbol}}/{{quoteToken.symbol}} — {{dexId}}
   Address: {{pairAddress}}
   💵 Price USD: {{#if priceUsd}}\${{priceUsd}}{{else}}-{{/if}}
   💧 Liquidity: \${{liquidityUsdFormatted}}
   📈 Volume 24h: \${{volumeH24Formatted}}

{{/each}}
{{#if (eq totalCount 0)}}No results found.{{/if}}
`.trim();
