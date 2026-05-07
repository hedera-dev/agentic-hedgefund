import type { MirrorNodeService } from './mirror-node.service.interface';
import type { TokenAddressService } from './token-address.service.interface';

import { ValidationError } from '@hiero-ledger/hiero-cli';

export class TokenAddressServiceImpl implements TokenAddressService {
  constructor(private readonly mirrorNode: MirrorNodeService) {}

  async resolveEvmAddress(input: string, network: string): Promise<string> {
    const trimmed = input.trim();
    const token = await this.mirrorNode.getToken(trimmed, network);
    const evmAddress = token.evm_address?.toLowerCase();

    if (!evmAddress) {
      throw new ValidationError(
        `Token ${trimmed} does not have a Mirror Node EVM address.`,
      );
    }

    return evmAddress;
  }
}
