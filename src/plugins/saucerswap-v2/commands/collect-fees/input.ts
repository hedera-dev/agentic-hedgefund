import { GasInputSchema, KeyManagerTypeSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2CollectFeesInputSchema = z.object({
  position: z
    .number()
    .int()
    .positive()
    .describe('NFT position serial (tokenId)'),
  unwrapHbar: z.boolean().optional().default(false),
  gas: GasInputSchema.default(300_000).describe('Gas limit'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
