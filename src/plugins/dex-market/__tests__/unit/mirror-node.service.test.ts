import { ValidationError } from '@hiero-ledger/hiero-cli';

import {
  SAUCE_EVM_ADDRESS,
  SAUCE_TOKEN_ID,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { MirrorNodeServiceImpl } from '@/plugins/dex-market/services/mirror-node.service';

describe('MirrorNodeServiceImpl', () => {
  let service: MirrorNodeServiceImpl;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new MirrorNodeServiceImpl();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('token ID reference uses token ID in path', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token_id: SAUCE_TOKEN_ID,
          evm_address: SAUCE_EVM_ADDRESS,
        }),
    });

    await service.getToken(SAUCE_TOKEN_ID, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      `https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${SAUCE_TOKEN_ID}`,
      expect.any(Object),
    );
  });

  test('0x EVM reference strips prefix in path', async () => {
    const evmAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token_id: SAUCE_TOKEN_ID,
          evm_address: evmAddress,
        }),
    });

    await service.getToken(evmAddress, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/AbCdEf1234567890AbCdEf1234567890AbCdEf12',
      expect.any(Object),
    );
  });

  test('400 response throws ValidationError', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(service.getToken('invalid', 'mainnet')).rejects.toThrow(
      ValidationError,
    );
  });
});
