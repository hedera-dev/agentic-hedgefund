import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV1DepositOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  amountA: z.string(),
  amountB: z.string(),
  amountAMin: z.string(),
  amountBMin: z.string(),
});

export type SaucerSwapV1DepositOutput = z.infer<
  typeof SaucerSwapV1DepositOutputSchema
>;

export const SAUCERSWAP_V1_DEPOSIT_TEMPLATE = `
✅ Liquidity deposited into SaucerSwap V1!
   Contract: {{hashscanLink contractId "contract" network}}
   Amount A: {{amountA}} (min {{amountAMin}})
   Amount B: {{amountB}} (min {{amountBMin}})
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
