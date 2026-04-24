import { getBytes, Interface } from 'ethers';

/**
 * ABI-encode a multicall wrapping multiple encoded function calls.
 */
export function encodeMulticall(
  abi: string | readonly string[],
  encodedCalls: Uint8Array[],
): Uint8Array {
  const iface = new Interface(abi as string[]);
  const callsAsHex = encodedCalls.map(
    (c) => '0x' + Buffer.from(c).toString('hex'),
  );
  const encoded = iface.encodeFunctionData('multicall', [callsAsHex]);
  return getBytes(encoded);
}
