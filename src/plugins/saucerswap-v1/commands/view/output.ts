import { NetworkSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1ViewOutputSchema = z.object({
  network: NetworkSchema,
  poolContractId: z.string(),
  tokenA: z.string(),
  tokenB: z.string(),
  reserveA: z.string(),
  reserveB: z.string(),
  lpTokenId: z.string().nullable().optional(),
});

export type SaucerSwapV1ViewOutput = z.infer<
  typeof SaucerSwapV1ViewOutputSchema
>;

export const SAUCERSWAP_V1_VIEW_TEMPLATE = `
Pool {{tokenA}} ⇄ {{tokenB}} on {{network}}
  Contract: {{poolContractId}}
  Reserves: {{reserveA}} / {{reserveB}}
  LP token: {{lpTokenId}}
`.trim();
