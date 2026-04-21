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

export const SaucerSwapV1SwapInputSchema = z.object({
  from: TokenReferenceObjectSchema.describe(
    'Input token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  to: TokenReferenceObjectSchema.describe(
    'Output token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  amount: AmountInputSchema.describe(
    'Exact input amount (display units or base units with "t" suffix).',
  ),
  minOutput: AmountInputSchema.optional().describe(
    'Minimum output amount (display units or base units with "t" suffix).',
  ),
  slippage: SlippageTolerancePercentSchema,
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(1000000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
