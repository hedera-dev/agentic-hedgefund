import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';

export interface SaucerSwapV1DepositNormalizedParams {
  config: SaucerSwapNetworkConfig;
  hbarSide: 'A' | 'B' | null;
  tokenAEvm: string;
  tokenBEvm: string;
  amountA: bigint;
  amountB: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  recipientEvmAddress: string;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV1DepositBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV1DepositSignTransactionResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV1DepositExecuteTransactionResult {
  transactionResult: TransactionResult;
}
