import { ValidationError } from '@hiero-ledger/hiero-cli';

/**
 * Asserts that a router query returned a non-empty amounts array.
 * Throws ValidationError for missing/scalar/too-short results instead of
 * crashing with a property-access error or computing with undefined.
 */
export function assertAmountsArray(
  value: unknown,
  functionName: string,
  context: Record<string, unknown>,
): bigint[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new ValidationError(
      `${functionName} returned no liquidity data — the pair may not exist or have no liquidity`,
      { context },
    );
  }
  return value as bigint[];
}
