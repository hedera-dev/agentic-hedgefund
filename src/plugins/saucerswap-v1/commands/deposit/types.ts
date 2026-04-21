import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';

export interface SaucerSwapV1DepositNormalizedTokenParams {
  config: SaucerSwapNetworkConfig;
  isHbar: false;
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

export interface SaucerSwapV1DepositNormalizedHbarParams {
  config: SaucerSwapNetworkConfig;
  isHbar: true;
  tokenEvm: string;
  hbarEvm: string;
  tokenAmount: bigint;
  hbarAmount: bigint;
  tokenMin: bigint;
  hbarMin: bigint;
  recipientEvmAddress: string;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export type SaucerSwapV1DepositNormalizedParams =
  | SaucerSwapV1DepositNormalizedTokenParams
  | SaucerSwapV1DepositNormalizedHbarParams;

export interface SaucerSwapV1DepositBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV1DepositSignTransactionResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV1DepositExecuteTransactionResult {
  transactionResult: TransactionResult;
}
