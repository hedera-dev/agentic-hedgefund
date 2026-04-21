import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1BuyOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  direction: z.string(),
  amountOut: z.string(),
  amountInMax: z.string(),
});

export type SaucerSwapV1BuyOutput = z.infer<typeof SaucerSwapV1BuyOutputSchema>;

export const SAUCERSWAP_V1_BUY_TEMPLATE = `
✅ SaucerSwap V1 buy submitted!
   Contract: {{hashscanLink contractId "contract" network}}
   Direction: {{direction}}
   Exact output: {{amountOut}}
   Max input: {{amountInMax}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
