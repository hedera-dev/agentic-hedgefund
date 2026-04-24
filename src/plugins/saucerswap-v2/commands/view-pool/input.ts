import { TokenReferenceObjectSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { SaucerSwapV2FeeTierSchema } from '@/plugins/saucerswap-v2/constants';
import { SaucerSwapApiKeySchema } from '@/shared/schemas/schemas';

export const SaucerSwapV2ViewPoolInputSchema = z.object({
  apiKey: SaucerSwapApiKeySchema,
  tokenA: TokenReferenceObjectSchema.describe(
    'First token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  tokenB: TokenReferenceObjectSchema.describe(
    'Second token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  feeTier: SaucerSwapV2FeeTierSchema.describe(
    'Pool fee tier: 500, 1500, 3000, or 10000 (basis points).',
  ),
});
