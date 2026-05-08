import type { HederaMirrornodeService } from '@hiero-ledger/hiero-cli';
import type { TokenInfo } from '@hiero-ledger/hiero-cli/dist/core/services/mirrornode/types';

import { NotFoundError, ValidationError } from '@hiero-ledger/hiero-cli';

import {
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';

function makeTokenInfo(tokenId = SAUCE_TOKEN_ID): TokenInfo {
  return {
    token_id: tokenId,
    symbol: 'SAUCE',
    name: 'SAUCE',
    decimals: '6',
    total_supply: '1000000000000',
    max_supply: '1000000000000',
    type: 'FUNGIBLE_COMMON' as TokenInfo['type'],
    treasury_account_id: '0.0.1234',
    created_timestamp: '1234567890.000000001',
    pause_status: 'UNPAUSED',
    memo: '',
  };
}

describe('TokenAddressServiceImpl', () => {
  test('token ID resolves through core Mirror Node token info', async () => {
    const mirrorNode = {
      getTokenInfo: jest.fn().mockResolvedValue(makeTokenInfo()),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    const result = await tokenAddress.resolveTokenAddress(
      SAUCE_TOKEN_ID,
      'mainnet',
    );

    expect(result).toEqual({
      tokenId: SAUCE_TOKEN_ID,
      evmAddress: SAUCE_EVM_ADDRESS,
    });
    expect(mirrorNode.getTokenInfo).toHaveBeenCalledWith(SAUCE_TOKEN_ID);
  });

  test('0x address resolves through core Mirror Node token info', async () => {
    const mirrorNode = {
      getTokenInfo: jest.fn().mockResolvedValue(makeTokenInfo()),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);
    const input = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';

    const result = await tokenAddress.resolveTokenAddress(input, 'mainnet');

    expect(result).toEqual({
      tokenId: SAUCE_TOKEN_ID,
      evmAddress: SAUCE_EVM_ADDRESS,
    });
    expect(mirrorNode.getTokenInfo).toHaveBeenCalledWith(
      'AbCdEf1234567890AbCdEf1234567890AbCdEf12',
    );
  });

  test('trims whitespace', async () => {
    const mirrorNode = {
      getTokenInfo: jest.fn().mockResolvedValue(makeTokenInfo()),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    const result = await tokenAddress.resolveTokenAddress(
      `  ${SAUCE_TOKEN_ID}  `,
      'mainnet',
    );

    expect(result).toEqual({
      tokenId: SAUCE_TOKEN_ID,
      evmAddress: SAUCE_EVM_ADDRESS,
    });
    expect(mirrorNode.getTokenInfo).toHaveBeenCalledWith(SAUCE_TOKEN_ID);
  });

  test('invalid input throws ValidationError', async () => {
    const mirrorNode = {
      getTokenInfo: jest
        .fn()
        .mockRejectedValue(new ValidationError('Invalid token reference')),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveTokenAddress('invalid', 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('empty string throws ValidationError', async () => {
    const mirrorNode = {
      getTokenInfo: jest
        .fn()
        .mockRejectedValue(new ValidationError('Invalid token reference')),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveTokenAddress('', 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('missing Mirror Node token_id throws ValidationError', async () => {
    const mirrorNode = {
      getTokenInfo: jest
        .fn()
        .mockResolvedValue({ ...makeTokenInfo(), token_id: '' }),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveTokenAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('Mirror Node 404 propagates NotFoundError', async () => {
    const mirrorNode = {
      getTokenInfo: jest
        .fn()
        .mockRejectedValue(new NotFoundError('Token not found')),
    } as unknown as HederaMirrornodeService;
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveTokenAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(NotFoundError);
  });
});
