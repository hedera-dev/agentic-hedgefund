import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SwapDirection } from '@/plugins/saucerswap-v1/commands/swap/types';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';

export interface SaucerSwapV1BuyNormalizedParams {
  config: SaucerSwapNetworkConfig;
  direction: SwapDirection;
  path: string[];
  recipientEvmAddress: string;
  amountOut: bigint;
  amountInMax: bigint;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV1BuyBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV1BuySignTransactionResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV1BuyExecuteTransactionResult {
  transactionResult: TransactionResult;
}
