import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2CollectFeesNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  tokenSN: bigint;
  recipientEvmAddress: string;
  unwrapHbar: boolean;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2CollectFeesBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2CollectFeesSignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2CollectFeesExecuteResult {
  transactionResult: TransactionResult;
}
