import { tokenEvmAddress } from '@/shared/util/token-evm';

export function isHbar(tokenReference: string, whbarTokenId: string): boolean {
  // toUpperCase is safe here: whbarTokenId is a dotted-decimal Hedera ID
  // (digits and dots only) and EVM addresses are hex — neither has letters
  // that would change meaning under case folding.
  const evmAddress = tokenEvmAddress(whbarTokenId).toUpperCase();
  const transformedTokenReference = tokenReference.trim().toUpperCase();
  return (
    transformedTokenReference === 'HBAR' ||
    transformedTokenReference === whbarTokenId ||
    transformedTokenReference === evmAddress
  );
}
