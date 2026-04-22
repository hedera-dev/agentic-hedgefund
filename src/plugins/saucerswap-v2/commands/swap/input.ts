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

export const SaucerSwapV2SwapInputSchema = z.object({
  from: TokenReferenceObjectSchema.describe(
    'Input token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  to: TokenReferenceObjectSchema.describe(
    'Output token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  amount: AmountInputSchema.describe(
    'Exact input amount (display units or base units with "t" suffix).',
  ),
  feeTier: SaucerSwapV2FeeTierSchema.describe(
    'Pool fee tier: 500, 1500, 3000, or 10000 (basis points).',
  ),
  minOutput: AmountInputSchema.optional().describe(
    'Minimum output (display units or base units with "t" suffix). If omitted, computed from --slippage and amount-in (approximate).',
  ),
  slippage: SlippageTolerancePercentSchema.default(0.5).describe(
    'Slippage tolerance (%) when min-output is omitted',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(300_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
