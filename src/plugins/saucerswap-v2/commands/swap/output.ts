import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2SwapOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  amountIn: z.string(),
  amountOutMin: z.string(),
  feeTier: z.number(),
});

export type SaucerSwapV2SwapOutput = z.infer<
  typeof SaucerSwapV2SwapOutputSchema
>;

export const SAUCERSWAP_V2_SWAP_TEMPLATE = `
✅ SaucerSwap V2 swap submitted!
   Router: {{hashscanLink contractId "contract" network}}
   Fee tier: {{feeTier}}
   Amount in: {{amountIn}}  Min out: {{amountOutMin}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
