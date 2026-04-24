import { NetworkSchema, TransactionIdSchema } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export const SaucerSwapV2DecreaseLiquidityOutputSchema = z.object({
  contractId: z.string(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  tokenSN: z.string(),
  liquidity: z.string(),
  unwrapHbar: z.boolean(),
  burn: z.boolean(),
});

export type SaucerSwapV2DecreaseLiquidityOutput = z.infer<
  typeof SaucerSwapV2DecreaseLiquidityOutputSchema
>;

export const SAUCERSWAP_V2_DECREASE_LIQUIDITY_TEMPLATE = `
✅ Decreased liquidity for position #{{tokenSN}}!
   Liquidity removed: {{liquidity}}
   Unwrap HBAR: {{unwrapHbar}}  Burn NFT: {{burn}}
   Transaction: {{hashscanLink transactionId "transaction" network}}
`.trim();
