import { z } from 'zod';

import { SaucerSwapApiKeySchema } from '@/shared/schemas/schemas';

export const SaucerSwapV2ListPoolsInputSchema = z.object({
  apiKey: SaucerSwapApiKeySchema,
  token: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Filter pools containing this token (Hedera token ID, symbol, or name substring).',
    ),
  feeTier: z
    .number()
    .int()
    .optional()
    .describe('Filter by fee tier (500, 1500, 3000, 10000).'),
});
