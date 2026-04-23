export function computeMinOutput(
  amount: bigint,
  slippagePercent: number,
): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return (amount * (10_000n - slippageBps)) / 10_000n;
}

export function computeMaxInput(
  amount: bigint,
  slippagePercent: number,
): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return (amount * (10_000n + slippageBps)) / 10_000n;
}
