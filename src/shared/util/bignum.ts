import type SdkBigNumberType from '@hashgraph/sdk/node_modules/bignumber.js';

/**
 * The SDK's convertToBigNumber does an `instanceof` check against its own
 * bundled bignumber.js (9.1.1), so a workspace BigNumber (10.x) always fails.
 * Passing a string bypasses the instanceof check — the SDK accepts strings,
 * numbers, and its own BigNumber instances interchangeably.
 */
export function toBigNumber(value: bigint): SdkBigNumberType {
  return value.toString() as unknown as SdkBigNumberType;
}
