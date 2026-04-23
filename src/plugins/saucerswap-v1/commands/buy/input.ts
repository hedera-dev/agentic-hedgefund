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

export const SaucerSwapV1BuyInputSchema = z.object({
  from: TokenReferenceObjectSchema.describe(
    'Input token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  to: TokenReferenceObjectSchema.describe(
    'Output token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  amount: AmountInputSchema.describe(
    'Exact output amount (display units or base units with "t" suffix).',
  ),
  maxInput: AmountInputSchema.optional().describe(
    'Maximum input amount willing to spend (display units or base units with "t" suffix). When omitted, computed automatically via getAmountsIn with slippage tolerance.',
  ),
  slippage: SlippageTolerancePercentSchema.default(0).describe(
    'Slippage tolerance (%)',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(1_000_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
