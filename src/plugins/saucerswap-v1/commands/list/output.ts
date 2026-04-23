import { NetworkSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1ListPoolSchema = z.object({
  id: z.union([z.string(), z.number()]),
  contractId: z.string(),
  tokenA: z.string(),
  tokenB: z.string(),
  reserveA: z.string(),
  reserveB: z.string(),
});

export const SaucerSwapV1ListOutputSchema = z.object({
  network: NetworkSchema,
  poolCount: z.number(),
  pools: z.array(SaucerSwapV1ListPoolSchema),
});

export type SaucerSwapV1ListOutput = z.infer<
  typeof SaucerSwapV1ListOutputSchema
>;

export const SAUCERSWAP_V1_LIST_TEMPLATE = `
Found {{poolCount}} pool(s) on {{network}}
{{#each pools}}
  • Pool #{{this.id}} ({{this.contractId}})
    {{this.tokenA}} ⇄ {{this.tokenB}}
    Reserves: {{this.reserveA}} / {{this.reserveB}}
{{/each}}
`.trim();
