import type { DexScreenerPair } from './dex-screener-types';

export interface DexScreenerService {
  getTokens(chainId: string, addresses: string[]): Promise<DexScreenerPair[]>;

  getTokenPairs(chainId: string, address: string): Promise<DexScreenerPair[]>;

  getPair(chainId: string, pairAddress: string): Promise<DexScreenerPair>;

  search(query: string): Promise<DexScreenerPair[]>;
}
