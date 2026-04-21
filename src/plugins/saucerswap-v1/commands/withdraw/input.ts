import { z } from 'zod';

export const SaucerSwapV1WithdrawInputSchema = z.object({
  tokenA: z.string().trim().min(1),
  tokenB: z.string().trim().min(1),
  liquidity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Liquidity must be a non-negative integer'),
  minAmountA: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Min amount A must be a non-negative integer')
    .optional(),
  minAmountB: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Min amount B must be a non-negative integer')
    .optional(),
  deadline: z.number().int().positive().optional().default(180),
  gas: z.number().int().positive().optional().default(2_800_000),
  keyManager: z.string().optional(),
});
