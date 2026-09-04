export interface Interval {
  low: number;
  high: number;
}

/**
 * Wilson score interval, not the normal approximation.
 *
 * The sample is small early and the normal approximation is badly wrong near
 * the boundaries — which is exactly when a player is most likely to over-read
 * their lead. Two wins from two rounds is not a 100% win rate with no
 * uncertainty, and the interface must not be able to say that it is.
 */
export function wilson(successes: number, trials: number, z = 1.96): Interval {
  if (trials <= 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);
  return {
    low: Math.max(0, (centre - spread) / denominator),
    high: Math.min(1, (centre + spread) / denominator),
  };
}

/** `68% over 140 rounds (95% CI: 60–75%)`. Stated, never implied. */
export function formatRate(successes: number, trials: number): string {
  if (trials === 0) return 'no rounds yet';
  const { low, high } = wilson(successes, trials);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return `${pct(successes / trials)} over ${trials} ${trials === 1 ? 'round' : 'rounds'} (95% CI: ${pct(low)}–${pct(high)})`;
}
