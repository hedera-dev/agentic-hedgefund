import { TokenId } from '@hiero-ledger/sdk';

import { EntityIdSchema, EvmAddressSchema, ValidationError } from '@hiero-ledger/hiero-cli';

export function resolveToEvmAddress(input: string): string {
  const trimmed = input.trim();

  if (EvmAddressSchema.safeParse(trimmed.toLowerCase()).success) {
    return trimmed.toLowerCase();
  }

  if (EntityIdSchema.safeParse(trimmed).success) {
    return `0x${TokenId.fromString(trimmed).toSolidityAddress()}`;
  }

  throw new ValidationError(
    `Invalid token reference '${input}'. Expected Hedera token ID (0.0.x) or EVM address (0x...).`,
  );
}
