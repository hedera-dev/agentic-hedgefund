import { z } from 'zod';

export const SaucerSwapV1ListInputSchema = z.object({
  token: z.string().trim().min(1).optional(),
});
