import {
  AmountInputSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  TokenReferenceObjectSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { SaucerSwapV2FeeTierSchema } from '@/plugins/saucerswap-v2/constants';
import {
  DeadlineSchema,
  SlippageTolerancePercentSchema,
} from '@/shared/schemas/schemas';

export const SaucerSwapV2MintPositionInputSchema = z
  .object({
    tokenA: TokenReferenceObjectSchema.describe(
      'First token (Hedera ID, alias, EVM address, or "HBAR")',
    ),
    tokenB: TokenReferenceObjectSchema.describe(
      'Second token (Hedera ID, alias, EVM address, or "HBAR")',
    ),
    feeTier: SaucerSwapV2FeeTierSchema.describe(
      'Pool fee tier: 500, 1500, 3000, or 10000 (basis points).',
    ),
    amountA: AmountInputSchema.describe(
      'Desired amount of token A (display units or base units with "t" suffix), before automatic token0/token1 ordering.',
    ),
    amountB: AmountInputSchema.describe(
      'Desired amount of token B (display units or base units with "t" suffix), before automatic token0/token1 ordering.',
    ),
    tickLower: z.number().int().optional(),
    tickUpper: z.number().int().optional(),
    rangePercent: z.number().positive().optional().default(5),
    slippage: SlippageTolerancePercentSchema.default(0.5).describe(
      'Slippage tolerance (%) for minimums',
    ),
    deadline: DeadlineSchema,
    gas: GasInputSchema.default(900_000).describe('Gas limit'),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
  })
  .refine(
    (v) =>
      (v.tickLower === undefined && v.tickUpper === undefined) ||
      (v.tickLower !== undefined && v.tickUpper !== undefined),
    {
      message:
        'tickLower and tickUpper must both be provided or both omitted (range-percent used when omitted)',
    },
  );
