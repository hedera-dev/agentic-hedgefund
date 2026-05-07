import { EntityIdSchema, ValidationError } from '@hiero-ledger/hiero-cli';
import { TokenId } from '@hiero-ledger/sdk';

export function tokenEvmAddress(tokenId: string): string {
  const result = EntityIdSchema.safeParse(tokenId);
  if (!result.success) {
    throw new ValidationError(
      `Could not transform provided string ${tokenId} to token ID`,
    );
  }
  return `0x${TokenId.fromString(result.data).toEvmAddress()}`;
}
