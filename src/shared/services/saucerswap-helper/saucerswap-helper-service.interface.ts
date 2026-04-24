import type { AccountResponse } from '@hiero-ledger/hiero-cli/dist/core/services/mirrornode/types';
import type {
  TokenInfoResult,
  TokenParams,
} from '@/shared/services/saucerswap-helper/types';

export interface SaucerSwapHelperService {
  resolveToken(params: TokenParams): Promise<TokenInfoResult>;
  resolveRecipient(): Promise<AccountResponse>;
}
