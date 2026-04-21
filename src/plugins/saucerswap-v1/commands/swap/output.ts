import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1SwapOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  direction: z.string(),
  amountIn: z.string(),
  amountOutMin: z.string(),
});

export type SaucerSwapV1SwapOutput = z.infer<
  typeof SaucerSwapV1SwapOutputSchema
>;

export const SAUCERSWAP_V1_SWAP_TEMPLATE = `
✅ SaucerSwap V1 swap submitted!
   Contract: {{hashscanLink contractId "contract" network}}
   Direction: {{direction}}
   Amount in: {{amountIn}}
   Min amount out: {{amountOutMin}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
