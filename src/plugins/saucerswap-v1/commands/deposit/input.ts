import { z } from 'zod';

export const SaucerSwapV1DepositInputSchema = z.object({
  tokenA: z.string().trim().min(1),
  tokenB: z.string().trim().min(1),
  amountA: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Amount A must be a non-negative integer'),
  amountB: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Amount B must be a non-negative integer'),
  slippage: z.number().min(0).max(100).optional().default(0.5),
  deadline: z.number().int().positive().optional().default(180),
  gas: z.number().int().positive().optional().default(240_000),
  keyManager: z.string().optional(),
});
