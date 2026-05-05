import type { Logger } from '@hiero-ledger/hiero-cli';
import type { DexScreenerService } from './dex-screener.service.interface';
import type { DexScreenerPair } from './dex-screener-types';

import { z } from 'zod';

import {
  NetworkError,
  NotFoundError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

import {
  DEX_SCREENER_BASE_URL,
  DEX_SCREENER_DEFAULT_TIMEOUT_MS,
} from './constants';

import {
  DexScreenerPairSchema,
  DexScreenerPairsResponseSchema,
  DexScreenerSearchResponseSchema,
} from './dex-screener-schemas';

export class DexScreenerServiceImpl implements DexScreenerService {
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_BACKOFF_MS = 500;

  constructor(private readonly logger: Logger) {}

  async getTokens(
    chainId: string,
    addresses: string[],
  ): Promise<DexScreenerPair[]> {
    const joined = addresses.join(',');
    const url = `${DEX_SCREENER_BASE_URL}/latest/dex/tokens/${joined}`;
    const raw = await this.fetchWithRetry(url);
    const parsed = this.parseOrThrow(DexScreenerPairsResponseSchema, raw);
    const pairs = parsed.pairs ?? [];
    return pairs.filter(
      (p) => p.chainId.toLowerCase() === chainId.toLowerCase(),
    );
  }

  async getTokenPairs(
    chainId: string,
    address: string,
  ): Promise<DexScreenerPair[]> {
    const url = `${DEX_SCREENER_BASE_URL}/token-pairs/v1/${chainId}/${address}`;
    const raw = await this.fetchWithRetry(url);
    return this.parseOrThrow(z.array(DexScreenerPairSchema), raw);
  }

  async getPair(
    chainId: string,
    pairAddress: string,
  ): Promise<DexScreenerPair> {
    const url = `${DEX_SCREENER_BASE_URL}/latest/dex/pairs/${chainId}/${pairAddress}`;
    const raw = await this.fetchWithRetry(url);
    const parsed = this.parseOrThrow(DexScreenerPairsResponseSchema, raw);

    const pair = parsed.pair ?? (parsed.pairs ?? [])[0];

    if (!pair) {
      throw new NotFoundError(`Pair ${pairAddress} not found on ${chainId}`, {
        context: { pairAddress, chainId },
      });
    }

    return pair;
  }

  async search(query: string): Promise<DexScreenerPair[]> {
    const encoded = encodeURIComponent(query);
    const url = `${DEX_SCREENER_BASE_URL}/latest/dex/search?q=${encoded}`;
    const raw = await this.fetchWithRetry(url);
    const parsed = this.parseOrThrow(DexScreenerSearchResponseSchema, raw);
    const pairs = parsed.pairs ?? [];
    return pairs.filter((p) => p.chainId.toLowerCase() === 'hedera');
  }

  private parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
    const result = schema.safeParse(raw);
    if (!result.success) throw ValidationError.fromZod(result.error);
    return result.data;
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    let lastError: Error | undefined;

    for (
      let attempt = 0;
      attempt < DexScreenerServiceImpl.MAX_RETRIES;
      attempt++
    ) {
      try {
        return await this.fetchOnce(url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof NetworkError && !error.recoverable) {
          throw error;
        }

        if (
          error instanceof NotFoundError ||
          error instanceof ValidationError
        ) {
          throw error;
        }

        const backoff =
          DexScreenerServiceImpl.INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        this.logger.warn(
          `DexScreener request failed (attempt ${attempt + 1}/${DexScreenerServiceImpl.MAX_RETRIES}), retrying in ${backoff}ms: ${lastError.message}`,
        );
        await this.delay(backoff);
      }
    }

    throw new NetworkError(
      `DexScreener request failed after ${DexScreenerServiceImpl.MAX_RETRIES} attempts: ${lastError?.message}`,
      { recoverable: true, cause: lastError },
    );
  }

  private async fetchOnce(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DEX_SCREENER_DEFAULT_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new NetworkError(
            `DexScreener HTTP ${response.status}: ${response.statusText}`,
            { recoverable: true },
          );
        }

        throw new NetworkError(
          `DexScreener HTTP ${response.status}: ${response.statusText}`,
          { recoverable: false },
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(
          `DexScreener request timed out after ${DEX_SCREENER_DEFAULT_TIMEOUT_MS}ms`,
          { recoverable: true, cause: error },
        );
      }

      throw new NetworkError('DexScreener request failed', {
        recoverable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
