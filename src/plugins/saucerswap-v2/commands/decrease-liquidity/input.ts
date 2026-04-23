import { GasInputSchema, KeyManagerTypeSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import {
  DeadlineSchema,
  SlippageTolerancePercentSchema,
} from '@/shared/schemas/schemas';

export const SaucerSwapV2DecreaseLiquidityInputSchema = z.object({
  position: z
    .number()
    .int()
    .positive()
    .describe('NFT position serial (tokenId)'),
  liquidity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Liquidity must be a non-negative integer'),
  slippage: SlippageTolerancePercentSchema.default(0.5).describe(
    'Slippage tolerance (%) for minimums on token amounts (if used)',
  ),
  deadline: DeadlineSchema,
  unwrapHbar: z.boolean().optional().default(false),
  burn: z.boolean().optional().default(false),
  gas: GasInputSchema.default(300_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
