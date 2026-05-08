import { z } from 'zod';

import {
  MarketTokenReferenceSchema,
  PositiveUsdAmountSchema,
} from '@/plugins/dex-market/commands/common/input-schemas';

export const MarketQuoteInputSchema = z.object({
  token: MarketTokenReferenceSchema,
  size: PositiveUsdAmountSchema.describe('Position size in USD'),
});

export type MarketQuoteInput = z.infer<typeof MarketQuoteInputSchema>;
