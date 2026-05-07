import { z } from 'zod';

import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

export const MarketPoolsOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  chain: z.literal(DEX_SCREENER_HEDERA_CHAIN_ID),
  tokenInput: z.string(),
  evmAddress: z.string(),
  limit: z.number().int().positive(),
  pools: z.array(
    z.object({
      pairAddress: z.string(),
      dexId: z.string(),
      baseToken: z.object({
        symbol: z.string(),
        address: z.string(),
      }),
      quoteToken: z.object({
        symbol: z.string(),
        address: z.string(),
      }),
      liquidityUsd: z.number().optional(),
      liquidityUsdFormatted: z.string().optional(),
      volumeH24: z.number(),
      volumeH24Formatted: z.string(),
      priceUsd: z.string().optional(),
      priceNative: z.string(),
      url: z.string(),
    }),
  ),
  totalCount: z.number().int().nonnegative(),
  returnedCount: z.number().int().nonnegative(),
  moreCount: z.number().int().nonnegative(),
});

export type MarketPoolsOutput = z.infer<typeof MarketPoolsOutputSchema>;

export const MARKET_POOLS_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

🌊 Pools for {{tokenInput}}
Chain: {{chain}}
Total: {{totalCount}}
Returned: {{returnedCount}}
{{#each pools}}
{{add1 @index}}. {{dexId}} — {{baseToken.symbol}}/{{quoteToken.symbol}}
   Address: {{pairAddress}}
   💧 Liquidity: \${{liquidityUsdFormatted}}
   📈 Volume 24h: \${{volumeH24Formatted}}
   💵 Price USD: {{#if priceUsd}}\${{priceUsd}}{{else}}-{{/if}}
   🔗 Dex: {{url}}

{{/each}}
{{#if (gt moreCount 0)}}
... and {{moreCount}} more pools (increase --limit to show more)
{{/if}}
`.trim();
