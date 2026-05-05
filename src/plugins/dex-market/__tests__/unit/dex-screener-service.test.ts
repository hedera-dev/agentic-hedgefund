import { NetworkError, NotFoundError } from '@hiero-ledger/hiero-cli';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';
import {
  fixtureSaucePair,
  fixtureUnknownChainPair,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeLogger } from '@/plugins/dex-market/__tests__/helpers/mocks';

describe('DexScreenerServiceImpl', () => {
  let service: DexScreenerServiceImpl;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new DexScreenerServiceImpl(makeLogger());
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTokens', () => {
    test('filters by chainId', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            schemaVersion: '1.0.0',
            pairs: [fixtureSaucePair, fixtureUnknownChainPair],
          }),
      });

      const result = await service.getTokens('hedera', [
        '0x00000000000000000000000000000000000b2ad5',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe('hedera');
    });

    test('null pairs → empty array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ schemaVersion: '1.0.0', pairs: null }),
      });

      const result = await service.getTokens('hedera', ['0x0']);
      expect(result).toEqual([]);
    });

    test('4xx → fail-fast NetworkError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getTokens('hedera', ['0x0'])).rejects.toThrow(
        NetworkError,
      );
    });

    test('429 → retry then NetworkError', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });

      await expect(service.getTokens('hedera', ['0x0'])).rejects.toThrow(
        NetworkError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTokenPairs', () => {
    test('returns raw array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([fixtureSaucePair]),
      });

      const result = await service.getTokenPairs(
        'hedera',
        '0x00000000000000000000000000000000000b2ad5',
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('getPair', () => {
    test('returns pair object', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            schemaVersion: '1.0.0',
            pairs: null,
            pair: fixtureSaucePair,
          }),
      });

      const result = await service.getPair(
        'hedera',
        '0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6',
      );

      expect(result.pairAddress).toBe(fixtureSaucePair.pairAddress);
    });

    test('missing pair → NotFoundError', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            schemaVersion: '1.0.0',
            pairs: null,
            pair: null,
          }),
      });

      await expect(service.getPair('hedera', '0x0')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('search', () => {
    test('filters hedera results', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            schemaVersion: '1.0.0',
            pairs: [fixtureSaucePair, fixtureUnknownChainPair],
          }),
      });

      const result = await service.search('SAUCE');
      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe('hedera');
    });
  });
});
