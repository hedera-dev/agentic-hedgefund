import type { HederaMirrornodeService } from '@hiero-ledger/hiero-cli';
import type { TokenAddressService } from './token-address.service.interface';

import { ValidationError } from '@hiero-ledger/hiero-cli';

export class TokenAddressServiceImpl implements TokenAddressService {
  constructor(private readonly mirrorNode: HederaMirrornodeService) {}

  async resolveEvmAddress(input: string, _network: string): Promise<string> {
    const trimmed = input.trim();
    const tokenReference = this.normalizeTokenReference(trimmed);
    const token = await this.mirrorNode.getTokenInfo(tokenReference);
    const tokenId = token.token_id;

    if (!tokenId) {
      throw new ValidationError(
        `Token ${trimmed} does not have a Mirror Node token ID.`,
      );
    }

    return this.tokenIdToEvmAddress(tokenId);
  }

  private normalizeTokenReference(tokenReference: string): string {
    if (tokenReference.toLowerCase().startsWith('0x')) {
      return tokenReference.slice(2);
    }

    return tokenReference;
  }

  private tokenIdToEvmAddress(tokenId: string): string {
    const parts = tokenId.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
      throw new ValidationError(
        `Mirror Node returned invalid token ID '${tokenId}'.`,
      );
    }

    const [shard, realm, num] = parts.map((part) => BigInt(part));
    const evmAddress =
      this.toPaddedHex(shard, 8) +
      this.toPaddedHex(realm, 16) +
      this.toPaddedHex(num, 16);

    return `0x${evmAddress}`;
  }

  private toPaddedHex(value: bigint, length: number): string {
    return value.toString(16).padStart(length, '0');
  }
}
