import { z } from 'zod';

export const MarketSearchInputSchema = z.object({
  query: z.string().min(1).describe('Token symbol, name, or address'),
  all: z.boolean().default(false).describe('Show all results (no limit)'),
});

export type MarketSearchInput = z.infer<typeof MarketSearchInputSchema>;
