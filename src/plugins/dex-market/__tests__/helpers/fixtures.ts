import { DEX_SCREENER_HEDERA_CHAIN_ID } from '@/plugins/dex-market/services/constants';

export const SAUCE_TOKEN_ID = '0.0.731861';
export const UNKNOWN_TOKEN_ID = '0.0.999999';
export const HBAR_TOKEN_ID = '0.0.456858';
export const SAUCE_EVM_ADDRESS = '0x00000000000000000000000000000000000b2ad5';
export const UNKNOWN_EVM_ADDRESS = '0x00000000000000000000000000000000000f423f';

export const fixtureSaucePair = {
  chainId: DEX_SCREENER_HEDERA_CHAIN_ID,
  dexId: 'saucerswap',
  url: 'https://dexscreener.com/hedera/0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6',
  pairAddress: '0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6',
  labels: [],
  baseToken: {
    address: SAUCE_EVM_ADDRESS,
    name: 'SAUCE',
    symbol: 'SAUCE',
  },
  quoteToken: {
    address: '0x0000000000000000000000000000000000163B5a',
    name: 'Wrapped Hbar',
    symbol: 'WHBAR',
  },
  priceNative: '0.2289',
  priceUsd: '0.02028',
  txns: {
    m5: { buys: 2, sells: 1 },
    h1: { buys: 10, sells: 5 },
    h6: { buys: 20, sells: 20 },
    h24: { buys: 40, sells: 41 },
  },
  volume: {
    m5: 100,
    h1: 1000,
    h6: 10000,
    h24: 20000,
  },
  priceChange: {
    m5: 0.11,
    h1: 0.33,
    h6: -0.55,
    h24: 1.23,
  },
  liquidity: {
    usd: 1908121.45,
    base: 100000,
    quote: 200000,
  },
  fdv: 18210989,
  marketCap: 18206974,
  pairCreatedAt: 1669778054000,
};

export const fixtureSaucePairV2 = {
  ...fixtureSaucePair,
  pairAddress: '0xCFEFfaAE43F176f91602D75ec1D0637E273c973b',
  baseToken: {
    address: SAUCE_EVM_ADDRESS,
    name: 'SAUCE',
    symbol: 'SAUCE',
  },
  quoteToken: {
    address: '0x00000000000000000000000000000000000c2be6',
    name: 'XSAUCE',
    symbol: 'XSAUCE',
  },
  liquidity: {
    usd: 500000,
    base: 50000,
    quote: 50000,
  },
};

export const fixtureUnknownChainPair = {
  ...fixtureSaucePair,
  chainId: 'ethereum',
  pairAddress: '0x1234567890abcdef1234567890abcdef12345678',
};

export const fixtureHbarPair = {
  chainId: DEX_SCREENER_HEDERA_CHAIN_ID,
  dexId: 'saucerswap',
  url: 'https://dexscreener.com/hedera/0x5fc19c944F1BCcF5159e6Ae92dC3bF2fF2576b98',
  pairAddress: '0x5fc19c944F1BCcF5159e6Ae92dC3bF2fF2576b98',
  labels: [],
  baseToken: {
    address: '0x0000000000000000000000000000000000163B5a',
    name: 'Wrapped Hbar',
    symbol: 'WHBAR',
  },
  quoteToken: {
    address: SAUCE_EVM_ADDRESS,
    name: 'SAUCE',
    symbol: 'SAUCE',
  },
  priceNative: '4.3623',
  priceUsd: '0.08792',
  txns: {
    m5: { buys: 1, sells: 2 },
    h1: { buys: 5, sells: 10 },
    h6: { buys: 15, sells: 20 },
    h24: { buys: 30, sells: 40 },
  },
  volume: {
    m5: 50,
    h1: 500,
    h6: 5000,
    h24: 10000,
  },
  priceChange: {
    m5: 0.05,
    h1: -0.1,
    h6: 0.5,
    h24: -2.0,
  },
  liquidity: {
    usd: 35686.97,
    base: 5000,
    quote: 10000,
  },
  fdv: 500000,
  marketCap: 450000,
  pairCreatedAt: 1670000000000,
};
