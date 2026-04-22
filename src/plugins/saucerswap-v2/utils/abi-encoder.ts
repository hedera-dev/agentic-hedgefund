import { getBytes, Interface } from 'ethers';

export function encodeContractCall(
  abi: string | readonly string[],
  functionName: string,
  params: unknown[],
): Uint8Array {
  const iface = new Interface(abi as string[]);
  const encoded = iface.encodeFunctionData(functionName, params);
  return getBytes(encoded);
}

export function decodeContractResult(
  abi: string | readonly string[],
  functionName: string,
  data: Uint8Array | string,
): unknown[] {
  const iface = new Interface(abi as string[]);
  const decoded = iface.decodeFunctionResult(functionName, data);
  return [...decoded];
}
