import type {
  BaseNormalizedParams,
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2SwapNormalizedParams extends BaseNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  path: string;
  recipientEvmAddress: string;
  amountIn: bigint;
  amountOutMin: bigint;
  fromIsHbar: boolean;
  toIsHbar: boolean;
  feeTier: number;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2SwapBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2SwapSignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2SwapExecuteResult {
  transactionResult: TransactionResult;
}
