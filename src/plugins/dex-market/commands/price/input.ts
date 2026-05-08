import { z } from 'zod';

import { MarketTokenReferenceSchema } from '@/plugins/dex-market/commands/common/input-schemas';
import { DEX_SCREENER_MAX_BATCH } from '@/plugins/dex-market/services/constants';

export const MarketPriceInputSchema = z.object({
  token: z
    .array(MarketTokenReferenceSchema)
    .min(1)
    .max(DEX_SCREENER_MAX_BATCH)
    .describe(
      `Token references (Hedera 0.0.x or EVM 0x...). Max ${DEX_SCREENER_MAX_BATCH}.`,
    ),
});

export type MarketPriceInput = z.infer<typeof MarketPriceInputSchema>;
