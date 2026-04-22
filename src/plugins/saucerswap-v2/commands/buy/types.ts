import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2BuyNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  pathReversed: string;
  recipientEvmAddress: string;
  amountOut: bigint;
  amountInMax: bigint;
  fromIsHbar: boolean;
  feeTier: number;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2BuyBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2BuySignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2BuyExecuteResult {
  transactionResult: TransactionResult;
}
