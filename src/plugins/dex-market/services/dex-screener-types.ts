import type { z } from 'zod';
import type {
  DexScreenerPairSchema,
  DexScreenerTokenInfoSchema,
} from './dex-screener-schemas';

export type DexScreenerTokenInfo = z.infer<typeof DexScreenerTokenInfoSchema>;

export type DexScreenerPair = z.infer<typeof DexScreenerPairSchema>;
