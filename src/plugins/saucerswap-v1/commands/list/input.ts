import { z } from 'zod';

import { SaucerSwapApiKeySchema } from '@/shared/schemas/schemas';

export const SaucerSwapV1ListInputSchema = z.object({
  apiKey: SaucerSwapApiKeySchema,
  token: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Filter pools containing this token (Hedera token ID, symbol, or name substring).',
    ),
});
