import type { MirrorNodeService } from '@/plugins/dex-market/services/mirror-node.service.interface';

import {
  EntityIdSchema,
  EvmAddressSchema,
  ValidationError,
} from '@hiero-ledger/hiero-cli';
import { MirrorNodeServiceImpl } from '@/plugins/dex-market/services/mirror-node.service';

export interface TokenAddressResolverService {
  resolveToEvmAddress(input: string, network: string): Promise<string>;
}

export class TokenAddressResolver implements TokenAddressResolverService {
  constructor(
    private readonly mirrorNode: MirrorNodeService = new MirrorNodeServiceImpl(),
  ) {}

  async resolveToEvmAddress(input: string, network: string): Promise<string> {
    const trimmed = input.trim();

    if (EvmAddressSchema.safeParse(trimmed.toLowerCase()).success) {
      return trimmed.toLowerCase();
    }

    if (EntityIdSchema.safeParse(trimmed).success) {
      const token = await this.mirrorNode.getToken(trimmed, network);
      const evmAddress = token.evm_address?.toLowerCase();

      if (!evmAddress || !EvmAddressSchema.safeParse(evmAddress).success) {
        throw new ValidationError(
          `Token ${trimmed} does not have a valid Mirror Node EVM address.`,
        );
      }

      return evmAddress;
    }

    throw new ValidationError(
      `Invalid token reference '${input}'. Expected Hedera token ID (0.0.x) or EVM address (0x...).`,
    );
  }
}

export async function resolveToEvmAddress(
  input: string,
  network: string,
  resolver = new TokenAddressResolver(),
): Promise<string> {
  const trimmed = input.trim();

  if (EvmAddressSchema.safeParse(trimmed.toLowerCase()).success) {
    return trimmed.toLowerCase();
  }

  return resolver.resolveToEvmAddress(trimmed, network);
}
