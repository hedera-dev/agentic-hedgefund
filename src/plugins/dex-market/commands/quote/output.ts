import { z } from 'zod';

export const MarketQuoteOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  tokenInput: z.string(),
  tokenId: z.string(),
  evmAddress: z.string(),
  sizeUsd: z.number(),
  sizeUsdFormatted: z.string(),
  topPool: z.object({
    pairAddress: z.string(),
    dexId: z.string(),
    liquidityUsd: z.number(),
    liquidityUsdFormatted: z.string(),
    priceUsd: z.string().optional(),
  }),
  estimatedSlippagePct: z.number(),
  warningLevel: z.enum(['low', 'medium', 'high']),
  formula: z.literal(
    'sizeUsd / (liquidityUsd + sizeUsd) (constant product approx)',
  ),
});

export type MarketQuoteOutput = z.infer<typeof MarketQuoteOutputSchema>;

export const MARKET_QUOTE_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

📊 Trade Quote
   Token ID: {{tokenId}}
   EVM: {{evmAddress}}
   💵 Size: \${{sizeUsdFormatted}}

🏆 Top Pool
   DEX: {{topPool.dexId}}
   Address: {{topPool.pairAddress}}
   💧 Liquidity: \${{topPool.liquidityUsdFormatted}}
   💵 Price USD: {{#if topPool.priceUsd}}\${{topPool.priceUsd}}{{else}}-{{/if}}

⚠️  Slippage
   Estimated: {{estimatedSlippagePct}}%
   Warning: {{warningLevel}}
   Formula: {{formula}}
`.trim();
