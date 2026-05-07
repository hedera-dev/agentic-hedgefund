import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { SaucerSwapNetworkConfig } from '@/plugins/saucerswap-v1/constants';
import type { SwapDirection } from '@/shared/types/shared.types';

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
