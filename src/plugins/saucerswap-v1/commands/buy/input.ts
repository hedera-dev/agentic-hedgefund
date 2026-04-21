import { z } from 'zod';

export const SaucerSwapV1BuyInputSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Exact output must be a non-negative integer'),
  maxInput: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Max input must be a non-negative integer'),
  deadline: z.number().int().positive().optional().default(180),
  gas: z.number().int().positive().optional().default(250_000),
  keyManager: z.string().optional(),
});
