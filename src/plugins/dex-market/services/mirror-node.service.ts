import type {
  MirrorNodeService,
  MirrorNodeToken,
} from './mirror-node.service.interface';

import {
  NetworkError,
  NotFoundError,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

const MIRROR_NODE_URLS: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const MIRROR_NODE_TIMEOUT_MS = 10_000;

const MirrorNodeTokenSchema = z.object({
  token_id: z.string(),
  evm_address: z.string().nullable().optional(),
});

export class MirrorNodeServiceImpl implements MirrorNodeService {
  async getToken(
    tokenReference: string,
    network: string,
  ): Promise<MirrorNodeToken> {
    const baseUrl = MIRROR_NODE_URLS[network];
    if (!baseUrl) {
      throw new ValidationError(
        `Mirror Node is not supported for network '${network}'.`,
      );
    }

    const trimmedReference = tokenReference.trim();
    const pathReference = this.normalizeTokenReferenceForPath(trimmedReference);
    const raw = await this.fetchToken(
      `${baseUrl}/api/v1/tokens/${pathReference}`,
      trimmedReference,
    );
    const parsed = MirrorNodeTokenSchema.safeParse(raw);
    if (!parsed.success) {
      throw ValidationError.fromZod(parsed.error);
    }

    return parsed.data;
  }

  private normalizeTokenReferenceForPath(tokenReference: string): string {
    if (tokenReference.toLowerCase().startsWith('0x')) {
      return tokenReference.slice(2);
    }

    return tokenReference;
  }

  private async fetchToken(
    url: string,
    tokenReference: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      MIRROR_NODE_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (response.status === 404) {
        throw new NotFoundError(
          `Token ${tokenReference} not found on Mirror Node`,
          { context: { tokenReference } },
        );
      }

      if (response.status === 400) {
        throw new ValidationError(
          `Invalid token reference '${tokenReference}' for Mirror Node.`,
        );
      }

      if (!response.ok) {
        throw new NetworkError(
          `Mirror Node HTTP ${response.status}: ${response.statusText}`,
          { recoverable: response.status >= 500 },
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(
          `Mirror Node request timed out after ${MIRROR_NODE_TIMEOUT_MS}ms`,
          { recoverable: true, cause: error },
        );
      }

      throw new NetworkError('Mirror Node request failed', {
        recoverable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
