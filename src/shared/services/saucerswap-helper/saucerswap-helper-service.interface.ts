import {
  TokenInfoResult,
  TokenParams,
} from '@/shared/services/saucerswap-helper/types';
import { AccountResponse } from '@hiero-ledger/hiero-cli/dist/core/services/mirrornode/types';

export interface SaucerSwapHelperService {
  resolveToken(params: TokenParams): Promise<TokenInfoResult>;
  resolveRecipient(): Promise<AccountResponse>;
}
