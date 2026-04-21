import type {
  SaucerSwapV1ApiLiquidityPool,
  SaucerSwapV2ApiPool,
  SaucerSwapV2ApiPosition,
} from '@/shared/schemas/schemas';

export interface SaucerSwapApiService {
  fetchAllPools(
    apiBaseUrl: string,
    apiKey: string,
  ): Promise<SaucerSwapV1ApiLiquidityPool[]>;
  /** Fetches all V1 pools and returns the one whose pair matches the two token IDs (order-independent). */
  findV1PoolForTokenPair(
    apiBaseUrl: string,
    apiKey: string,
    tokenIdA: string,
    tokenIdB: string,
  ): Promise<SaucerSwapV1ApiLiquidityPool | null>;
  fetchV2Pools(
    apiBaseUrl: string,
    apiKey: string,
  ): Promise<SaucerSwapV2ApiPool[]>;
  fetchV2Positions(
    apiBaseUrl: string,
    accountId: string,
    apiKey: string,
  ): Promise<SaucerSwapV2ApiPosition[]>;
}
