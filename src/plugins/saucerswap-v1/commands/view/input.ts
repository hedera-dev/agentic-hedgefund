import { TokenReferenceObjectSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { SaucerSwapApiKeySchema } from '@/shared/schemas/schemas';

export const SaucerSwapV1ViewInputSchema = z.object({
  apiKey: SaucerSwapApiKeySchema,
  tokenA: TokenReferenceObjectSchema.describe(
    'First token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  tokenB: TokenReferenceObjectSchema.describe(
    'Second token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
});
