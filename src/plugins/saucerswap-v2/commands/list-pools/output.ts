import { NetworkSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2ListPoolItemSchema = z.object({
  contractId: z.string(),
  tokenA: z.string(),
  tokenB: z.string(),
  feeTier: z.number(),
});

export const SaucerSwapV2ListPoolsOutputSchema = z.object({
  network: NetworkSchema,
  poolCount: z.number(),
  pools: z.array(SaucerSwapV2ListPoolItemSchema),
});

export type SaucerSwapV2ListPoolsOutput = z.infer<
  typeof SaucerSwapV2ListPoolsOutputSchema
>;

export const SAUCERSWAP_V2_LIST_POOLS_TEMPLATE = `
Found {{poolCount}} V2 pool(s) on {{network}}
{{#each pools}}
  • {{this.tokenA}} ⇄ {{this.tokenB}} @ {{this.feeTier}} — {{this.contractId}}
{{/each}}
`.trim();
