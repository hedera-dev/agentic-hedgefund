import { z } from 'zod';

import { DexScreenerTokenInfoSchema } from '@/plugins/dex-market/services/dex-screener-schemas';

export const MarketPairOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  chain: z.literal('hedera'),
  pairAddress: z.string(),
  dexId: z.string(),
  url: z.string(),
  labels: z.array(z.string()).optional(),
  baseToken: DexScreenerTokenInfoSchema,
  quoteToken: DexScreenerTokenInfoSchema,
  priceUsd: z.string().optional(),
  priceNative: z.string(),
  liquidityUsd: z.number().optional(),
  liquidityUsdFormatted: z.string().optional(),
  volumeH24: z.number(),
  volumeH24Formatted: z.string(),
  txnsH24: z.object({
    buys: z.number(),
    sells: z.number(),
  }),
  fdv: z.number().optional(),
  marketCap: z.number().optional(),
  pairCreatedAt: z.number().optional(),
  priceChangeM5: z.number().optional(),
  priceChangeH1: z.number().optional(),
  priceChangeH6: z.number().optional(),
  priceChangeH24: z.number().optional(),
});

export type MarketPairOutput = z.infer<typeof MarketPairOutputSchema>;

export const MARKET_PAIR_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

🔗 Pair Detail
   Address: {{pairAddress}}
   DEX: {{dexId}}
   Chain: {{chain}}
   🔗 URL: {{url}}

🪙 Tokens
   Base:  {{baseToken.symbol}} ({{baseToken.name}}) — {{baseToken.address}}
   Quote: {{quoteToken.symbol}} ({{quoteToken.name}}) — {{quoteToken.address}}

💵 Pricing
   USD: {{#if priceUsd}}\${{priceUsd}}{{else}}-{{/if}}  |  Native: {{priceNative}}
   📊 24h: {{#if priceChangeH24}}{{priceChangeH24}}%{{else}}-{{/if}}  6h: {{#if priceChangeH6}}{{priceChangeH6}}%{{else}}-{{/if}}  1h: {{#if priceChangeH1}}{{priceChangeH1}}%{{else}}-{{/if}}  5m: {{#if priceChangeM5}}{{priceChangeM5}}%{{else}}-{{/if}}

💧 Liquidity
   USD: \${{liquidityUsdFormatted}}

📈 Volume (24h)
   \${{volumeH24Formatted}}

🔄 Transactions (24h)
   Buys: {{txnsH24.buys}}  |  Sells: {{txnsH24.sells}}

📋 Metadata
   FDV: {{#if fdv}}\${{fdv}}{{else}}-{{/if}}
   Market Cap: {{#if marketCap}}\${{marketCap}}{{else}}-{{/if}}
   Created: {{#if pairCreatedAt}}{{pairCreatedAt}}{{else}}-{{/if}}
`.trim();
