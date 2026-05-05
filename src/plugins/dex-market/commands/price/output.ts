import { z } from 'zod';

export const MarketPriceItemSchema = z.object({
  input: z.string(),
  evmAddress: z.string(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  indexed: z.boolean(),
  priceUsd: z.string().optional(),
  priceNative: z.string().optional(),
  liquidityUsd: z.number().optional(),
  liquidityUsdFormatted: z.string().optional(),
  topPair: z
    .object({
      pairAddress: z.string(),
      dexId: z.string(),
      quoteSymbol: z.string(),
    })
    .optional(),
  priceChangeM5: z.number().optional(),
  priceChangeH1: z.number().optional(),
  priceChangeH6: z.number().optional(),
  priceChangeH24: z.number().optional(),
});

export const MarketPriceOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  chain: z.literal('hedera'),
  tokens: z.array(MarketPriceItemSchema),
  totalCount: z.number().int().nonnegative(),
  indexedCount: z.number().int().nonnegative(),
  notFound: z.array(z.string()),
});

export type MarketPriceOutput = z.infer<typeof MarketPriceOutputSchema>;

export const MARKET_PRICE_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

💰 Token Prices  |  {{indexedCount}}/{{totalCount}} indexed
{{#each tokens}}
{{add1 @index}}. {{#if indexed}}{{symbol}} ({{name}}){{else}}❌ NOT INDEXED{{/if}}
   {{#if indexed}}
   💵 USD: \${{priceUsd}}  |  Native: {{priceNative}}
   💧 Liquidity: \${{liquidityUsdFormatted}}
   📊 24h: {{#if priceChangeH24}}{{priceChangeH24}}%{{else}}-{{/if}}  6h: {{#if priceChangeH6}}{{priceChangeH6}}%{{else}}-{{/if}}  1h: {{#if priceChangeH1}}{{priceChangeH1}}%{{else}}-{{/if}}  5m: {{#if priceChangeM5}}{{priceChangeM5}}%{{else}}-{{/if}}
   🔗 Top pair: {{topPair.dexId}} {{topPair.pairAddress}}
   {{/if}}

{{/each}}
{{#if notFound.length}}
❌ Not Found: {{#each notFound}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
`.trim();
