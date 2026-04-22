/**
 * Encode a V2 swap path: [token(20B) + fee(3B) + token(20B) + fee(3B) + ...]
 * Each token is an EVM address (0x-prefixed hex, 20 bytes).
 * Each fee is a uint24 (3 bytes, big-endian).
 */
export function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error('tokens.length must equal fees.length + 1');
  }

  let path = '0x';
  for (let i = 0; i < fees.length; i++) {
    path += stripHex(tokens[i]);
    path += fees[i].toString(16).padStart(6, '0');
  }
  path += stripHex(tokens[tokens.length - 1]);
  return path;
}

/**
 * Build the reversed path for exactOutput (output token first).
 */
export function encodePathReversed(tokens: string[], fees: number[]): string {
  return encodePath([...tokens].reverse(), [...fees].reverse());
}

function stripHex(address: string): string {
  return address.toLowerCase().startsWith('0x') ? address.slice(2) : address;
}
