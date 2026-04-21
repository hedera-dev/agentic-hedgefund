import {
  AmountInputSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  TokenReferenceObjectSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import {
  DeadlineSchema,
  SlippageTolerancePercentSchema,
} from '@/shared/schemas/schemas';

export const SaucerSwapV1DepositInputSchema = z.object({
  tokenA: TokenReferenceObjectSchema.describe(
    'First token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  tokenB: TokenReferenceObjectSchema.describe(
    'Second token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  amountA: AmountInputSchema.describe(
    'Desired amount of token A (display units or base units with "t" suffix).',
  ),
  amountB: AmountInputSchema.describe(
    'Desired amount of token B (display units or base units with "t" suffix).',
  ),
  slippage: SlippageTolerancePercentSchema.default(0.5).describe(
    'Slippage tolerance (%)',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(1_000_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
