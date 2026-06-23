import { NetworkError, NotFoundError } from '@hiero-ledger/hiero-cli';

import {
  fixtureSaucePair,
  fixtureUnknownChainPair,
  SAUCE_EVM_ADDRESS,
} from '@/plugins/dex-market/__tests__/helpers/fixtures';
import { makeLogger } from '@/plugins/dex-market/__tests__/helpers/mocks';
import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';
import { DexScreenerServiceImpl } from '@/plugins/dex-market/services/dex-screener.service';

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

      const result = await service.getTokens(DEX_SCREENER_HEDERA_CHAIN_ID, [
        SAUCE_EVM_ADDRESS,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(DEX_SCREENER_HEDERA_CHAIN_ID);
    });

    test('null pairs → empty array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ schemaVersion: '1.0.0', pairs: null }),
      });

      const result = await service.getTokens(DEX_SCREENER_HEDERA_CHAIN_ID, [
        '0x0',
      ]);
      expect(result).toEqual([]);
    });

    test('4xx → fail-fast NetworkError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getTokens(DEX_SCREENER_HEDERA_CHAIN_ID, ['0x0']),
      ).rejects.toThrow(NetworkError);
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

      await expect(
        service.getTokens(DEX_SCREENER_HEDERA_CHAIN_ID, ['0x0']),
      ).rejects.toThrow(NetworkError);
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
        DEX_SCREENER_HEDERA_CHAIN_ID,
        SAUCE_EVM_ADDRESS,
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
        DEX_SCREENER_HEDERA_CHAIN_ID,
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

      await expect(
        service.getPair(DEX_SCREENER_HEDERA_CHAIN_ID, '0x0'),
      ).rejects.toThrow(NotFoundError);
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
      expect(result[0].chainId).toBe(DEX_SCREENER_HEDERA_CHAIN_ID);
    });
  });
});
