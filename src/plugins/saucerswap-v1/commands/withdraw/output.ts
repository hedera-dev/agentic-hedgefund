import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1WithdrawOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  liquidity: z.string(),
});

export type SaucerSwapV1WithdrawOutput = z.infer<
  typeof SaucerSwapV1WithdrawOutputSchema
>;

export const SAUCERSWAP_V1_WITHDRAW_TEMPLATE = `
✅ Liquidity withdrawn from SaucerSwap V1!
   Contract: {{hashscanLink contractId "contract" network}}
   Liquidity: {{liquidity}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
