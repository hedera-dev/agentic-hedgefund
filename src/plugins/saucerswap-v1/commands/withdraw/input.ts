import {
  AmountInputSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  TokenReferenceObjectSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { DeadlineSchema } from '@/shared/schemas/schemas';

/** Typical LP token decimals for Uniswap V2–style pairs (display amounts without `t` suffix). */
const LP_PAIR_DECIMALS = 18;

export const SaucerSwapV1WithdrawInputSchema = z.object({
  tokenA: TokenReferenceObjectSchema.describe(
    'First token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  tokenB: TokenReferenceObjectSchema.describe(
    'Second token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  liquidity: AmountInputSchema.describe(
    `LP amount to remove (display units or base units with "t" suffix; display uses ${LP_PAIR_DECIMALS} decimals).`,
  ),
  minAmountA: AmountInputSchema.optional().describe(
    'Minimum token A returned (display units or base units with "t" suffix).',
  ),
  minAmountB: AmountInputSchema.optional().describe(
    'Minimum token B returned (display units or base units with "t" suffix).',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(2_800_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
