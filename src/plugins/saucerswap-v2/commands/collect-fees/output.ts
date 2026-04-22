import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2CollectFeesOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  tokenSN: z.string(),
  unwrapHbar: z.boolean(),
});

export type SaucerSwapV2CollectFeesOutput = z.infer<
  typeof SaucerSwapV2CollectFeesOutputSchema
>;

export const SAUCERSWAP_V2_COLLECT_FEES_TEMPLATE = `
✅ Fees collected for position #{{tokenSN}}!
   Unwrap HBAR: {{unwrapHbar}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
