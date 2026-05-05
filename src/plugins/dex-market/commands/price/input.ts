import { z } from 'zod';

const DEX_SCREENER_MAX_BATCH = 30;

export const MarketPriceInputSchema = z.object({
  tokens: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1).max(DEX_SCREENER_MAX_BATCH))
    .describe(
      'Comma-separated token references (Hedera 0.0.x or EVM 0x...). Max 30.',
    ),
});

export type MarketPriceInput = z.infer<typeof MarketPriceInputSchema>;
