import { tokenEvmAddress } from '@/shared/util/token-evm';

export function isHbar(tokenReference: string, whbarTokenId: string): boolean {
  const evmAddress = tokenEvmAddress(whbarTokenId).toUpperCase();
  const transformedTokenReference = tokenReference.trim().toUpperCase();
  return (
    transformedTokenReference === 'HBAR' ||
    transformedTokenReference === whbarTokenId ||
    transformedTokenReference === evmAddress
  );
}
