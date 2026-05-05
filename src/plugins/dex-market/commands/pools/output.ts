import { z } from 'zod';

export const MarketPoolsOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  chain: z.literal('hedera'),
  tokenInput: z.string(),
  evmAddress: z.string(),
  all: z.boolean(),
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
{{#each pools}}
{{add1 @index}}. {{dexId}} — {{baseToken.symbol}}/{{quoteToken.symbol}}
   Address: {{pairAddress}}
   💧 Liquidity: \${{liquidityUsdFormatted}}
   📈 Volume 24h: \${{volumeH24Formatted}}
   💵 Price USD: {{#if priceUsd}}\${{priceUsd}}{{else}}-{{/if}}
   🔗 Dex: {{url}}

{{/each}}
{{#if (gt moreCount 0)}}
{{#unless all}}
... and {{moreCount}} more pools (use --all to show all)
{{/unless}}
{{/if}}
`.trim();
