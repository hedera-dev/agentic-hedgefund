import type { DexScreenerPair } from '@/plugins/dex-market/services/dex-screener-types';

export function getLiquidityUsd(pair: DexScreenerPair): number {
  return pair.liquidity?.usd ?? 0;
}

export function sortByLiquidityDesc(
  pairs: DexScreenerPair[],
): DexScreenerPair[] {
  return [...pairs].sort((a, b) => getLiquidityUsd(b) - getLiquidityUsd(a));
}

export function findTopLiquidityPair(
  pairs: DexScreenerPair[],
): DexScreenerPair | undefined {
  return sortByLiquidityDesc(pairs)[0];
}
