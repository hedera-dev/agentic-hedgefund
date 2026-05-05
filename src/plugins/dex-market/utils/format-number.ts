export function formatNumber(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
