import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2BuyOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  amountOut: z.string(),
  amountInMax: z.string(),
  feeTier: z.number(),
});

export type SaucerSwapV2BuyOutput = z.infer<typeof SaucerSwapV2BuyOutputSchema>;

export const SAUCERSWAP_V2_BUY_TEMPLATE = `
✅ SaucerSwap V2 buy submitted!
   Router: {{hashscanLink contractId "contract" network}}
   Fee tier: {{feeTier}}
   Exact out: {{amountOut}}  Max in: {{amountInMax}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
