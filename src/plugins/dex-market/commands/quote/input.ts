import { z } from 'zod';

export const MarketQuoteInputSchema = z.object({
  token: z.string().describe('Token ID or EVM address'),
  size: z.coerce.number().positive().describe('Position size in USD'),
});

export type MarketQuoteInput = z.infer<typeof MarketQuoteInputSchema>;
