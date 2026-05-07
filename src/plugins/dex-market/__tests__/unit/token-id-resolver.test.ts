import { NotFoundError, ValidationError } from '@hiero-ledger/hiero-cli';
import {
  resolveToEvmAddress,
  TokenAddressResolver,
} from '@/plugins/dex-market/utils/token-id-resolver';
import {
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';

describe('resolveToEvmAddress', () => {
  test('token ID resolves through Mirror Node evm_address', async () => {
    const mirrorNode = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: SAUCE_EVM_ADDRESS,
      }),
    };
    const resolver = new TokenAddressResolver(mirrorNode);

    const result = await resolver.resolveToEvmAddress(
      SAUCE_TOKEN_ID,
      'mainnet',
    );

    expect(result).toBe(SAUCE_EVM_ADDRESS);
    expect(mirrorNode.getToken).toHaveBeenCalledWith(SAUCE_TOKEN_ID, 'mainnet');
  });

  test('0x address → lowercase passthrough without Mirror Node', async () => {
    const mirrorNode = {
      getToken: jest.fn(),
    };
    const resolver = new TokenAddressResolver(mirrorNode);

    const result = await resolver.resolveToEvmAddress(
      '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      'mainnet',
    );

    expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(mirrorNode.getToken).not.toHaveBeenCalled();
  });

  test('trims whitespace', async () => {
    const mirrorNode = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: SAUCE_EVM_ADDRESS,
      }),
    };
    const resolver = new TokenAddressResolver(mirrorNode);

    const result = await resolver.resolveToEvmAddress(
      `  ${SAUCE_TOKEN_ID}  `,
      'mainnet',
    );

    expect(result).toBe(SAUCE_EVM_ADDRESS);
  });

  test('invalid input → ValidationError', async () => {
    await expect(resolveToEvmAddress('invalid', 'mainnet')).rejects.toThrow(
      ValidationError,
    );
  });

  test('empty string → ValidationError', async () => {
    await expect(resolveToEvmAddress('', 'mainnet')).rejects.toThrow(
      ValidationError,
    );
  });

  test('missing Mirror Node evm_address → ValidationError', async () => {
    const mirrorNode = {
      getToken: jest.fn().mockResolvedValue({
        token_id: SAUCE_TOKEN_ID,
        evm_address: null,
      }),
    };
    const resolver = new TokenAddressResolver(mirrorNode);

    await expect(
      resolver.resolveToEvmAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(ValidationError);
  });

  test('Mirror Node 404 → NotFoundError', async () => {
    const mirrorNode = {
      getToken: jest
        .fn()
        .mockRejectedValue(new NotFoundError('Token not found')),
    };
    const resolver = new TokenAddressResolver(mirrorNode);

    await expect(
      resolver.resolveToEvmAddress(SAUCE_TOKEN_ID, 'mainnet'),
    ).rejects.toThrow(NotFoundError);
  });
});
