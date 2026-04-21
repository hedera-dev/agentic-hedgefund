import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';

export enum SwapDirection {
  HBAR_FOR_TOKEN = 'HBAR_FOR_TOKEN',
  TOKEN_FOR_HBAR = 'TOKEN_FOR_HBAR',
  TOKEN_FOR_TOKEN = 'TOKEN_FOR_TOKEN',
}

export interface SaucerSwapV1SwapNormalizedParams {
  config: SaucerSwapNetworkConfig;
  direction: SwapDirection;
  path: string[];
  recipientEvmAddress: string;
  amountIn: bigint;
  amountOutMin: bigint;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV1SwapBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV1SwapSignTransactionResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV1SwapExecuteTransactionResult {
  transactionResult: TransactionResult;
}
