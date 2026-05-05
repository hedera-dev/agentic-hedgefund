import { z } from 'zod';

export const MarketLiquidityOutputSchema = z.object({
  network: z.string(),
  networkMismatchWarning: z.boolean(),
  tokenInput: z.string(),
  evmAddress: z.string(),
  totalLiquidityUsd: z.number(),
  totalLiquidityUsdFormatted: z.string(),
  poolCount: z.number().int().nonnegative(),
  topPool: z
    .object({
      pairAddress: z.string(),
      dexId: z.string(),
      liquidityUsd: z.number().optional(),
      liquidityUsdFormatted: z.string().optional(),
      priceUsd: z.string().optional(),
    })
    .optional(),
  threshold: z.number(),
  thresholdFormatted: z.string(),
  hasHealthyLiquidity: z.boolean(),
});

export type MarketLiquidityOutput = z.infer<typeof MarketLiquidityOutputSchema>;

export const MARKET_LIQUIDITY_TEMPLATE = `
{{#if networkMismatchWarning}}
⚠️  WARNING: Market data is from mainnet, but your current network is {{network}}.
   The market plugin supports mainnet only.
{{/if}}

💧 Liquidity Health
   Token: {{tokenInput}}
   💧 Total Liquidity: \${{totalLiquidityUsdFormatted}}
   🌊 Pools: {{poolCount}}
   🎯 Threshold: \${{thresholdFormatted}}
   Status: {{#if hasHealthyLiquidity}}✅ HEALTHY{{else}}❌ BELOW THRESHOLD{{/if}}

{{#if topPool}}
🏆 Top Pool
   DEX: {{topPool.dexId}}
   Address: {{topPool.pairAddress}}
   💧 Liquidity: \${{topPool.liquidityUsdFormatted}}
   💵 Price USD: {{#if topPool.priceUsd}}\${{topPool.priceUsd}}{{else}}-{{/if}}
{{/if}}
`.trim();
