import type {
  SaucerSwapV1ApiLiquidityPool,
  SaucerSwapV2ApiPool,
  SaucerSwapV2ApiPosition,
} from '@/shared/schemas/schemas';

export interface SaucerSwapApiService {
  fetchAllPools(apiBaseUrl: string): Promise<SaucerSwapV1ApiLiquidityPool[]>;
  fetchV2Pools(apiBaseUrl: string): Promise<SaucerSwapV2ApiPool[]>;
  fetchV2Positions(
    apiBaseUrl: string,
    accountId: string,
  ): Promise<SaucerSwapV2ApiPosition[]>;
}
