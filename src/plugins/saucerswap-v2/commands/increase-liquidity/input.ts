import {
  AmountInputSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import {
  DeadlineSchema,
  SlippageTolerancePercentSchema,
} from '@/shared/schemas/schemas';

export const SaucerSwapV2IncreaseLiquidityInputSchema = z.object({
  position: z
    .number()
    .int()
    .positive()
    .describe('NFT position serial (tokenId) for the V2 LP NFT'),
  amountA: AmountInputSchema.describe(
    'Amount for pool token0 (display units or base units with "t" suffix, matching token0 order on-chain).',
  ),
  amountB: AmountInputSchema.describe(
    'Amount for pool token1 (display units or base units with "t" suffix, matching token1 order on-chain).',
  ),
  hbarAmount: AmountInputSchema.optional().describe(
    'When increasing an HBAR-side position: tinybars to attach (display or "t" raw tinybars) for payable increase.',
  ),
  slippage: SlippageTolerancePercentSchema.default(0.5).describe(
    'Slippage tolerance (%) for minimums',
  ),
  deadline: DeadlineSchema,
  gas: GasInputSchema.default(330_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
