import type {
  EntityReferenceType,
  SupportedNetwork,
} from '@hiero-ledger/hiero-cli';
import type { TokenInfo } from '@hiero-ledger/hiero-cli/dist/core/services/mirrornode/types';

export interface TokenParams {
  value: string;
  type: EntityReferenceType;
  whbarTokenId: string;
  network: SupportedNetwork;
}

export interface TokenInfoResult {
  tokenInfo: TokenInfo;
  isHbar: boolean;
}
