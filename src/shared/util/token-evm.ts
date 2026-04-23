import { TokenId } from '@hashgraph/sdk';
import { EntityIdSchema, ValidationError } from '@hiero-ledger/hiero-cli';

export function tokenEvmAddress(tokenId: string): string {
  const result = EntityIdSchema.safeParse(tokenId);
  if (!result.success) {
    throw new ValidationError(
      `Could not transform provided string ${tokenId} to token ID`,
    );
  }
  return `0x${TokenId.fromString(result.data).toEvmAddress()}`;
}
