import { z } from 'zod';

export const DexScreenerTokenInfoSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
});

export const DexScreenerPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  url: z.string().url(),
  pairAddress: z.string(),
  labels: z.array(z.string()).optional(),
  baseToken: DexScreenerTokenInfoSchema,
  quoteToken: DexScreenerTokenInfoSchema,
  priceNative: z.string(),
  priceUsd: z.string().optional(),
  txns: z.object({
    m5: z.object({ buys: z.number(), sells: z.number() }),
    h1: z.object({ buys: z.number(), sells: z.number() }),
    h6: z.object({ buys: z.number(), sells: z.number() }),
    h24: z.object({ buys: z.number(), sells: z.number() }),
  }),
  volume: z.object({
    m5: z.number(),
    h1: z.number(),
    h6: z.number(),
    h24: z.number(),
  }),
  priceChange: z
    .object({
      m5: z.number().optional(),
      h1: z.number().optional(),
      h6: z.number().optional(),
      h24: z.number().optional(),
    })
    .partial(),
  liquidity: z
    .object({
      usd: z.number().optional(),
      base: z.number(),
      quote: z.number(),
    })
    .optional(),
  fdv: z.number().optional(),
  marketCap: z.number().optional(),
  pairCreatedAt: z.number().optional(),
  info: z.record(z.string(), z.unknown()).optional(),
});

export const DexScreenerSearchResponseSchema = z.object({
  schemaVersion: z.string().optional(),
  pairs: z.array(DexScreenerPairSchema).nullable(),
});

export const DexScreenerPairsResponseSchema = z.object({
  schemaVersion: z.string().optional(),
  pairs: z.array(DexScreenerPairSchema).nullable(),
  pair: DexScreenerPairSchema.optional().nullable(),
});
