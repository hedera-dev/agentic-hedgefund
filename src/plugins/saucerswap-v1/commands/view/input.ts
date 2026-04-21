import { TokenReferenceObjectSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1ViewInputSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe('SaucerSwap API key sent as x-api-key header.'),
  tokenA: TokenReferenceObjectSchema.describe(
    'First token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
  tokenB: TokenReferenceObjectSchema.describe(
    'Second token (Hedera ID, alias, EVM address, or "HBAR")',
  ),
});
