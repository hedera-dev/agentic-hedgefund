import { z } from 'zod';

export const SaucerSwapV1ViewInputSchema = z.object({
  tokenA: z.string().trim().min(1),
  tokenB: z.string().trim().min(1),
});
