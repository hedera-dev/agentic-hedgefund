import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2MintPositionOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  feeTier: z.number(),
  tickLower: z.number(),
  tickUpper: z.number(),
  amount0Desired: z.string(),
  amount1Desired: z.string(),
});

export type SaucerSwapV2MintPositionOutput = z.infer<
  typeof SaucerSwapV2MintPositionOutputSchema
>;

export const SAUCERSWAP_V2_MINT_POSITION_TEMPLATE = `
✅ SaucerSwap V2 mint-position submitted!
   NFT manager: {{hashscanLink contractId "contract" network}}
   Fee tier: {{feeTier}}  Range: [{{tickLower}}, {{tickUpper}}]
   Amounts desired: {{amount0Desired}} / {{amount1Desired}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
