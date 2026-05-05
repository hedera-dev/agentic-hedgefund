import { z } from 'zod';

export const MarketPoolsInputSchema = z.object({
  token: z.string().describe('Token ID 0.0.x or EVM 0x...'),
  all: z.boolean().default(false).describe('Show all pools (no limit)'),
});

export type MarketPoolsInput = z.infer<typeof MarketPoolsInputSchema>;
