import { ValidationError } from '@hiero-ledger/hiero-cli';
import {
  EntityIdSchema,
  EvmAddressSchema,
} from '@hiero-ledger/hiero-cli';

export function resolveToEvmAddress(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (EvmAddressSchema.safeParse(trimmed).success) {
    return trimmed;
  }

  if (EntityIdSchema.safeParse(trimmed).success) {
    return entityIdToEvmAddress(trimmed);
  }

  throw new ValidationError(
    `Invalid token reference '${input}'. Expected Hedera token ID (0.0.x) or EVM address (0x...).`,
  );
}

function entityIdToEvmAddress(entityId: string): string {
  const [shardStr, realmStr, numStr] = entityId.split('.');
  const shard = BigInt(shardStr);
  const realm = BigInt(realmStr);
  const num = BigInt(numStr);

  const buf = Buffer.alloc(20);
  buf.writeUInt32BE(Number(shard), 0);
  buf.writeBigUInt64BE(realm, 4);
  buf.writeBigUInt64BE(num, 12);

  return `0x${buf.toString('hex')}`;
}
