import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';

export interface SaucerSwapV1WithdrawNormalizedTokenParams {
  config: SaucerSwapNetworkConfig;
  isHbar: false;
  tokenAEvm: string;
  tokenBEvm: string;
  liquidity: bigint;
  minAmountA: bigint;
  minAmountB: bigint;
  recipientEvmAddress: string;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV1WithdrawNormalizedHbarParams {
  config: SaucerSwapNetworkConfig;
  isHbar: true;
  tokenEvm: string;
  liquidity: bigint;
  tokenMin: bigint;
  hbarMin: bigint;
  recipientEvmAddress: string;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export type SaucerSwapV1WithdrawNormalizedParams =
  | SaucerSwapV1WithdrawNormalizedTokenParams
  | SaucerSwapV1WithdrawNormalizedHbarParams;

export interface SaucerSwapV1WithdrawBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV1WithdrawSignTransactionResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV1WithdrawExecuteTransactionResult {
  transactionResult: TransactionResult;
}
