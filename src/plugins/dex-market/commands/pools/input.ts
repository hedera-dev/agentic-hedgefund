import { z } from 'zod';

import {
  MarketTokenReferenceSchema,
  PositiveIntegerLimitSchema,
} from '@/plugins/dex-market/commands/common/input-schemas';
import { DEFAULT_POOLS_LIMIT } from '@/plugins/dex-market/services/constants';

export const MarketPoolsInputSchema = z.object({
  token: MarketTokenReferenceSchema.describe('Token ID 0.0.x or EVM 0x...'),
  limit: PositiveIntegerLimitSchema.default(DEFAULT_POOLS_LIMIT).describe(
    'Maximum number of pools to return',
  ),
});

export type MarketPoolsInput = z.infer<typeof MarketPoolsInputSchema>;
