import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  BaseNormalizedParams,
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2DecreaseLiquidityNormalizedParams extends BaseNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  tokenSN: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  recipientEvmAddress: string;
  unwrapHbar: boolean;
  burn: boolean;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2DecreaseLiquidityBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2DecreaseLiquiditySignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2DecreaseLiquidityExecuteResult {
  transactionResult: TransactionResult;
}
