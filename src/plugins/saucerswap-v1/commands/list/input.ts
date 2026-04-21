import { z } from 'zod';

export const SaucerSwapV1ListInputSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe('SaucerSwap API key sent as x-api-key header.'),
  token: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Filter pools containing this token (Hedera token ID, symbol, or name substring).',
    ),
});
