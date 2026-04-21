import type { SaucerSwapApiService } from './saucerswap-api-service.interface';

import { CliError, NetworkError } from '@hiero-ledger/hiero-cli';

import {
  SaucerSwapV1ApiLiquidityPoolArraySchema,
  SaucerSwapV2ApiPoolArraySchema,
  SaucerSwapV2ApiPositionArraySchema,
} from '@/shared/schemas/schemas';
import { parseWithSchema } from '@/shared/util/parse-with-schema.zod';

export class SaucerSwapApiServiceImpl implements SaucerSwapApiService {
  async fetchAllPools(apiBaseUrl: string) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/pools/`;
    const data = await this.fetchJson(url, 'SaucerSwap V1 pools');
    return parseWithSchema(
      SaucerSwapV1ApiLiquidityPoolArraySchema,
      data,
      'SaucerSwap V1 pools',
    );
  }

  async fetchV2Pools(apiBaseUrl: string) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/v2/pools/`;
    const data = await this.fetchJson(url, 'SaucerSwap V2 pools');
    return parseWithSchema(
      SaucerSwapV2ApiPoolArraySchema,
      data,
      'SaucerSwap V2 pools',
    );
  }

  async fetchV2Positions(apiBaseUrl: string, accountId: string) {
    const url = `${this.stripTrailingSlash(apiBaseUrl)}/v2/nfts/${accountId}`;
    const data = await this.fetchJson(url, 'SaucerSwap V2 positions');
    return parseWithSchema(
      SaucerSwapV2ApiPositionArraySchema,
      data,
      'SaucerSwap V2 positions',
    );
  }

  private stripTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private async fetchJson(url: string, context: string): Promise<unknown> {
    try {
      const response = await fetch(url);
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
