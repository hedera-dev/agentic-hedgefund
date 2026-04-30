import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  BaseNormalizedParams,
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2IncreaseLiquidityNormalizedParams extends BaseNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  tokenSN: bigint;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  hbarAmount: bigint | null;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2IncreaseLiquidityBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2IncreaseLiquiditySignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2IncreaseLiquidityExecuteResult {
  transactionResult: TransactionResult;
}
