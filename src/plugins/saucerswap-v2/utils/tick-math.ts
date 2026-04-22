export function nearestUsableTick(tick: number, tickSpacing: number): number {
  return Math.round(tick / tickSpacing) * tickSpacing;
}

/**
 * Compute ticks for a symmetric ±percentage range around the current tick.
 */
export function tickRangeFromPercent(
  currentTick: number,
  percentDelta: number,
  tickSpacing: number,
): { tickLower: number; tickUpper: number } {
  const tickDelta = Math.floor(
    Math.log(1 + percentDelta / 100) / Math.log(1.0001),
  );
  return {
    tickLower: nearestUsableTick(currentTick - tickDelta, tickSpacing),
    tickUpper: nearestUsableTick(currentTick + tickDelta, tickSpacing),
  };
}
