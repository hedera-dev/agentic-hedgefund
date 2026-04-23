import type { SaucerSwapV2ApiPool, SaucerSwapV2ApiToken } from '@/shared/schemas/schemas';

export function matchesPoolFilter(
  pool: SaucerSwapV2ApiPool,
  filter: { feeTier?: number; token?: string },
): boolean {
  if (filter.feeTier !== undefined && Number(pool.fee) !== filter.feeTier) {
    return false;
  }
  if (!filter.token) return true;
  const norm = filter.token.toUpperCase();
  return (
    pool.tokenA.id === filter.token ||
    pool.tokenB.id === filter.token ||
    pool.tokenA.symbol.toUpperCase() === norm ||
    pool.tokenB.symbol.toUpperCase() === norm
  );
}

export function matchesApiPool(
  tokenA: SaucerSwapV2ApiToken,
  tokenB: SaucerSwapV2ApiToken,
  tokenIdA: string,
  tokenIdB: string,
): boolean {
  const a = tokenIdA.toLowerCase();
  const b = tokenIdB.toLowerCase();
  const poolA = tokenA.id.toLowerCase();
  const poolB = tokenB.id.toLowerCase();
  return (poolA === a && poolB === b) || (poolA === b && poolB === a);
}
