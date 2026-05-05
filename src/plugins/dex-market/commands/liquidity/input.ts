import { z } from 'zod';

export const MarketLiquidityInputSchema = z.object({
  token: z.string().describe('Token ID or EVM address'),
  minUsd: z.coerce
    .number()
    .nonnegative()
    .default(10_000)
    .describe('Minimum healthy liquidity threshold in USD'),
});

export type MarketLiquidityInput = z.infer<typeof MarketLiquidityInputSchema>;
