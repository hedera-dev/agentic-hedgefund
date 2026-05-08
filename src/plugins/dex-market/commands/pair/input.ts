import { z } from 'zod';

import { EvmAddressSchema } from '@hiero-ledger/hiero-cli';

export const MarketPairInputSchema = z.object({
  pair: EvmAddressSchema.describe('Pair contract EVM address'),
});

export type MarketPairInput = z.infer<typeof MarketPairInputSchema>;
