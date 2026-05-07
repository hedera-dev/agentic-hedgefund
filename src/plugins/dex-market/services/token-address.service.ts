import type { MirrorNodeService } from './mirror-node.service.interface';
import type { TokenAddressService } from './token-address.service.interface';

import {
  EntityIdSchema,
  EvmAddressSchema,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

export class TokenAddressServiceImpl implements TokenAddressService {
  constructor(private readonly mirrorNode: MirrorNodeService) {}

  async resolveEvmAddress(input: string, network: string): Promise<string> {
    const trimmed = input.trim();
    const lowercased = trimmed.toLowerCase();

    if (EvmAddressSchema.safeParse(lowercased).success) {
      return lowercased;
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
