import {
  AmountInputSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  TokenReferenceObjectSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { SaucerSwapV2FeeTierSchema } from '@/plugins/saucerswap-v2/constants';
import { DeadlineSchema } from '@/shared/schemas/schemas';

export const SaucerSwapV2BuyInputSchema = z.object({
  from: TokenReferenceObjectSchema.describe(
    'Input token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  to: TokenReferenceObjectSchema.describe(
    'Output token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  amount: AmountInputSchema.describe(
    'Exact output amount (display units or base units with "t" suffix).',
  ),
  maxInput: AmountInputSchema.describe(
    'Maximum input (display or raw) willing to pay for exact output.',
  ),
  feeTier: SaucerSwapV2FeeTierSchema.describe(
    'Pool fee tier: 500, 1500, 3000, or 10000 (basis points).',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(300_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
