import type { MirrorNodeService } from '@/plugins/dex-market/services/mirror-node.service.interface';

import { NotFoundError, ValidationError } from '@hiero-ledger/hiero-cli';

import {
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { TokenAddressServiceImpl } from '@/plugins/dex-market/services/token-address.service';

describe('TokenAddressServiceImpl', () => {
  test('token ID resolves through Mirror Node evm_address', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: SAUCE_EVM_ADDRESS,
      }),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    const result = await tokenAddress.resolveEvmAddress(
      SAUCE_TOKEN_ID,
      'mainnet',
    );

    expect(result).toBe(SAUCE_EVM_ADDRESS);
    expect(mirrorNode.getToken).toHaveBeenCalledWith(SAUCE_TOKEN_ID, 'mainnet');
  });

  test('0x address lowercases without Mirror Node', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn(),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    const result = await tokenAddress.resolveEvmAddress(
      '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      'mainnet',
    );

    expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(mirrorNode.getToken).not.toHaveBeenCalled();
  });

  test('trims whitespace', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: SAUCE_EVM_ADDRESS,
      }),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    const result = await tokenAddress.resolveEvmAddress(
      `  ${SAUCE_TOKEN_ID}  `,
      'mainnet',
    );

    expect(result).toBe(SAUCE_EVM_ADDRESS);
  });

  test('invalid input throws ValidationError', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn(),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveEvmAddress('invalid', 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('empty string throws ValidationError', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn(),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(tokenAddress.resolveEvmAddress('', 'mainnet')).rejects.toThrow(
      ValidationError,
    );
  });

  test('missing Mirror Node evm_address throws ValidationError', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: null,
      }),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveEvmAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('Mirror Node 404 propagates NotFoundError', async () => {
    const mirrorNode: MirrorNodeService = {
      getToken: jest
        .fn()
        .mockRejectedValue(new NotFoundError('Token not found')),
    };
    const tokenAddress = new TokenAddressServiceImpl(mirrorNode);

    await expect(
      tokenAddress.resolveEvmAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(NotFoundError);
  });
});
