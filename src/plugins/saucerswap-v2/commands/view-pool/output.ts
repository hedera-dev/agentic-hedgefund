import { NetworkSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2ViewPoolOutputSchema = z.object({
  network: NetworkSchema,
  poolAddress: z.string().nullable(),
  tokenA: z.string(),
  tokenB: z.string(),
  feeTier: z.number(),
  tickCurrent: z.number().nullable(),
  liquidity: z.string().nullable(),
  sqrtRatioX96: z.string().nullable(),
});

export type SaucerSwapV2ViewPoolOutput = z.infer<
  typeof SaucerSwapV2ViewPoolOutputSchema
>;

export const SAUCERSWAP_V2_VIEW_POOL_TEMPLATE = `
Pool {{tokenA}} ⇄ {{tokenB}} @ {{feeTier}} on {{network}}
  Pool address: {{poolAddress}}
  Current tick: {{tickCurrent}}
  Liquidity: {{liquidity}}
  sqrtPriceX96: {{sqrtRatioX96}}
`.trim();
