import { z } from 'zod';

import {
  MarketTokenReferenceSchema,
  NonNegativeUsdAmountSchema,
} from '@/plugins/dex-market/commands/common/input-schemas';
import { DEFAULT_MIN_LIQUIDITY_USD } from '@/plugins/dex-market/services/constants';

export const MarketLiquidityInputSchema = z.object({
  token: MarketTokenReferenceSchema,
  minUsd: NonNegativeUsdAmountSchema.default(
    DEFAULT_MIN_LIQUIDITY_USD,
  ).describe('Minimum healthy liquidity threshold in USD'),
});

export type MarketLiquidityInput = z.infer<typeof MarketLiquidityInputSchema>;
