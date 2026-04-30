import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  BaseNormalizedParams,
  SupportedNetwork,
  TransactionResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV2NetworkConfig } from '@/plugins/saucerswap-v2/constants';

export interface SaucerSwapV2MintPositionNormalizedParams extends BaseNormalizedParams {
  config: SaucerSwapV2NetworkConfig;
  token0Evm: string;
  token1Evm: string;
  hbarSide: '0' | '1' | null;
  feeTier: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  recipientEvmAddress: string;
  deadlineSeconds: number;
  gas: number;
  network: SupportedNetwork;
}

export interface SaucerSwapV2MintPositionBuildResult {
  transaction: ContractExecuteTransaction;
}

export interface SaucerSwapV2MintPositionSignResult {
  signedTransaction: Transaction;
}

export interface SaucerSwapV2MintPositionExecuteResult {
  transactionResult: TransactionResult;
}
