import type {
  HederaMirrornodeService,
  IdentityResolutionService,
  NetworkService,
} from '@hiero-ledger/hiero-cli';
import type { AccountResponse } from '@hiero-ledger/hiero-cli/dist/core/services/mirrornode/types';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type {
  TokenInfoResult,
  TokenParams,
} from '@/shared/services/saucerswap-helper/types';

import { AliasType, ValidationError } from '@hiero-ledger/hiero-cli';

import { isHbar } from '@/shared/util/hbar-detection';

export class SaucerSwapHelperServiceImpl implements SaucerSwapHelperService {
  constructor(
    private readonly mirrorService: HederaMirrornodeService,
    private readonly networkService: NetworkService,
    private readonly identityResolution: IdentityResolutionService,
  ) {}

  async resolveToken(params: TokenParams): Promise<TokenInfoResult> {
    const hbar = isHbar(params.value, params.whbarTokenId);
    const tokenId = hbar
      ? params.whbarTokenId
      : this.identityResolution.resolveReferenceToEntityOrEvmAddress({
          entityReference: params.value,
          referenceType: params.type,
          network: params.network,
          aliasType: AliasType.Token,
        }).entityIdOrEvmAddress;
    const tokenInfo = await this.mirrorService.getTokenInfo(tokenId);
    return { tokenInfo, isHbar: hbar };
  }

  async resolveRecipient(): Promise<AccountResponse> {
    const operator = this.networkService.getCurrentOperatorOrThrow();
    const payer = this.networkService.getPayer();
    const recipientAccountId = payer?.accountId ?? operator.accountId;
    const recipientAccountResponse =
      await this.mirrorService.getAccount(recipientAccountId);
    if (!recipientAccountResponse || !recipientAccountResponse.evmAddress) {
      throw new ValidationError(
        `Couldn't resolve operator account to evm address`,
      );
    }
    return recipientAccountResponse;
  }
}
