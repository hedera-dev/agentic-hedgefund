import type { SaucerSwapApiService } from './saucerswap-api-service.interface';

import { CliError, NetworkError } from '@hiero-ledger/hiero-cli';

import {
  SaucerSwapV1ApiLiquidityPoolArraySchema,
  SaucerSwapV2ApiPoolArraySchema,
  SaucerSwapV2ApiPositionArraySchema,
} from '@/shared/schemas/schemas';
import { parseWithSchema } from '@/shared/util/parse-with-schema.zod';

export class SaucerSwapApiServiceImpl implements SaucerSwapApiService {
  async fetchAllPools(apiBaseUrl: string, apiKey: string) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/pools/`;
    const data = await this.fetchJson(url, apiKey, 'SaucerSwap V1 pools');
    return parseWithSchema(
      SaucerSwapV1ApiLiquidityPoolArraySchema,
      data,
      'SaucerSwap V1 pools',
    );
  }

  async findV1PoolForTokenPair(
    apiBaseUrl: string,
    apiKey: string,
    tokenIdA: string,
    tokenIdB: string,
  ) {
    const pools = await this.fetchAllPools(apiBaseUrl, apiKey);
    const a = this.normalizeV1TokenId(tokenIdA);
    const b = this.normalizeV1TokenId(tokenIdB);
    return (
      pools.find((p) => {
        const pa = this.normalizeV1TokenId(String(p.tokenA.id));
        const pb = this.normalizeV1TokenId(String(p.tokenB.id));
        return (pa === a && pb === b) || (pa === b && pb === a);
      }) ?? null
    );
  }

  async fetchV2Pools(apiBaseUrl: string, apiKey: string) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/v2/pools/`;
    const data = await this.fetchJson(url, apiKey, 'SaucerSwap V2 pools');
    return parseWithSchema(
      SaucerSwapV2ApiPoolArraySchema,
      data,
      'SaucerSwap V2 pools',
    );
  }

  async fetchV2Positions(
    apiBaseUrl: string,
    accountId: string,
    apiKey: string,
  ) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/v2/nfts/${accountId}`;
    const data = await this.fetchJson(url, apiKey, 'SaucerSwap V2 positions');
    return parseWithSchema(
      SaucerSwapV2ApiPositionArraySchema,
      data,
      'SaucerSwap V2 positions',
    );
  }

  private normalizeV1TokenId(id: string): string {
    return id.trim().toLowerCase();
  }

  private stripTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private async fetchJson(
    url: string,
    apiKey: string,
    context: string,
  ): Promise<unknown> {
    try {
      const response = await fetch(url, {
        headers: { 'x-api-key': apiKey },
      });
      if (!response.ok) {
        throw new NetworkError(
          `SaucerSwap API error (${context}): ${response.status} ${response.statusText}`,
          { recoverable: true, context: { url, status: response.status } },
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(`SaucerSwap API request failed (${context})`, {
        cause: error,
        recoverable: true,
        context: { url },
      });
    }
  }
}
