import { z } from 'zod';

import {
  MarketSearchQuerySchema,
  PositiveIntegerLimitSchema,
} from '@/plugins/dex-market/commands/common/input-schemas';
import { DEFAULT_SEARCH_LIMIT } from '@/plugins/dex-market/services/constants';

export const MarketSearchInputSchema = z.object({
  query: MarketSearchQuerySchema,
  limit: PositiveIntegerLimitSchema.default(DEFAULT_SEARCH_LIMIT).describe(
    'Maximum number of results to return',
  ),
});

export type MarketSearchInput = z.infer<typeof MarketSearchInputSchema>;
