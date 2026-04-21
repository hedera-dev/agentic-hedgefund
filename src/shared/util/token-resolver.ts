import type { CoreApi, SupportedNetwork } from '@hiero-ledger/hiero-cli';

import { AccountId, TokenId } from '@hashgraph/sdk';
import {
  AliasType,
  EntityReferenceType,
  NotFoundError,
} from '@hiero-ledger/hiero-cli';

import { isHbar } from '@/shared/util/hbar-detection';

export { tokenEvmAddress } from '@/shared/util/token-evm';

export interface TokenResolution {
  tokenId: string | null;
  evmAddress: string;
}

export type TokenReferenceInput =
  | string
  | { type: EntityReferenceType; value: string };

function normalizeTokenReference(tokenReference: TokenReferenceInput): {
  referenceType: EntityReferenceType;
  value: string;
} {
  if (typeof tokenReference === 'string') {
    return {
      value: tokenReference,
      referenceType: inferRefType(tokenReference),
    };
  }
  return {
    value: tokenReference.value,
    referenceType: tokenReference.type,
  };
}

/**
 * Resolve a token reference (alias, ID, EVM address, or the literal "HBAR")
 * into its EVM (solidity) address. For HBAR the caller must substitute the
 * network's WHBAR token. The function returns both the Hedera ID (when known)
 * and the EVM address.
 */
export function resolveTokenToEvm(
  api: CoreApi,
  tokenReference: TokenReferenceInput,
  network: SupportedNetwork,
  whbarTokenId: string,
): TokenResolution {
  const { value, referenceType } = normalizeTokenReference(tokenReference);

  if (isHbar(value, whbarTokenId)) {
    throw new NotFoundError(
      'HBAR must be substituted with the network WHBAR token before resolution',
      { context: { tokenReference: value } },
    );
  }

  if (isEvmAddress(value)) {
    return { tokenId: null, evmAddress: value.toLowerCase() };
  }

  const resolved = api.identityResolution.resolveReferenceToEntityOrEvmAddress({
    entityReference: value,
    referenceType,
    network,
    aliasType: AliasType.Token,
  }).entityIdOrEvmAddress;

  if (isEvmAddress(resolved)) {
    return { tokenId: null, evmAddress: resolved.toLowerCase() };
  }

  const evmAddress = `0x${TokenId.fromString(resolved).toSolidityAddress()}`;
  return { tokenId: resolved, evmAddress };
}

function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function inferRefType(value: string): EntityReferenceType {
  if (isEvmAddress(value)) return EntityReferenceType.EVM_ADDRESS;
  if (/^0\.0\.[1-9][0-9]*$/.test(value)) return EntityReferenceType.ENTITY_ID;
  return EntityReferenceType.ALIAS;
}

export function accountIdToEvmAddress(accountId: string): string {
  return `0x${AccountId.fromString(accountId).toSolidityAddress()}`;
}
