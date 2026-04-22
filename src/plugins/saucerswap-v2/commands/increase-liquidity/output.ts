import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2IncreaseLiquidityOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  tokenSN: z.string(),
  amount0Desired: z.string(),
  amount1Desired: z.string(),
});

export type SaucerSwapV2IncreaseLiquidityOutput = z.infer<
  typeof SaucerSwapV2IncreaseLiquidityOutputSchema
>;

export const SAUCERSWAP_V2_INCREASE_LIQUIDITY_TEMPLATE = `
✅ Increased liquidity for position #{{tokenSN}}!
   Amounts: {{amount0Desired}} / {{amount1Desired}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
