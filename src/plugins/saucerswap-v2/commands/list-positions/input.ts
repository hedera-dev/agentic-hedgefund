import { AccountReferenceObjectSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

import { SaucerSwapApiKeySchema } from '@/shared/schemas/schemas';

export const SaucerSwapV2ListPositionsInputSchema = z.object({
  apiKey: SaucerSwapApiKeySchema,
  account: AccountReferenceObjectSchema.describe(
    'Account ID, EVM address, or alias.',
  ),
});
