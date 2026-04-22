import { NetworkSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2ListPositionItemSchema = z.object({
  tokenSN: z.number(),
  feeTier: z.number().optional().nullable(),
  tickLower: z.number().optional().nullable(),
  tickUpper: z.number().optional().nullable(),
  liquidity: z.string().optional().nullable(),
  tokensOwed0: z.string().optional().nullable(),
  tokensOwed1: z.string().optional().nullable(),
});

export const SaucerSwapV2ListPositionsOutputSchema = z.object({
  network: NetworkSchema,
  accountId: z.string(),
  positionCount: z.number(),
  positions: z.array(SaucerSwapV2ListPositionItemSchema),
});

export type SaucerSwapV2ListPositionsOutput = z.infer<
  typeof SaucerSwapV2ListPositionsOutputSchema
>;

export const SAUCERSWAP_V2_LIST_POSITIONS_TEMPLATE = `
Found {{positionCount}} V2 position(s) for {{accountId}} on {{network}}
{{#each positions}}
  • Position #{{this.tokenSN}} (fee tier {{this.feeTier}})
    Range: [{{this.tickLower}}, {{this.tickUpper}}]  Liquidity: {{this.liquidity}}
    Uncollected: {{this.tokensOwed0}} / {{this.tokensOwed1}}
{{/each}}
`.trim();
