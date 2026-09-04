import type { Move } from '../engine/types';

export interface Lag {
  lag: number;
  correlation: number;
  /** Two standard errors under the null of no correlation. */
  band: number;
  significant: boolean;
}

/**
 * Serial correlation at lags 1 through 10, on the sequence mapped to ±1.
 *
 * The band drawn with it is 2/sqrt(n), the two-standard-error envelope under
 * the null of an independent sequence. A stem outside the band is a finding; a
 * stem inside it is noise, and the chart has to say which is which or it is
 * just decoration.
 */
export function serialCorrelation(sequence: readonly Move[], maxLag = 10): Lag[] {
  const n = sequence.length;
  const values = sequence.map((m) => (m === 1 ? 1 : -1));
  const mean = n === 0 ? 0 : values.reduce((a, b) => a + b, 0) / n;
  const centred = values.map((v) => v - mean);
  const variance = centred.reduce((a, b) => a + b * b, 0);

  return Array.from({ length: maxLag }, (_, i) => {
    const lag = i + 1;
    if (n <= lag + 1 || variance === 0) {
      return { lag, correlation: 0, band: 1, significant: false };
    }
    let sum = 0;
    for (let t = lag; t < n; t += 1) sum += (centred[t] ?? 0) * (centred[t - lag] ?? 0);
    const correlation = sum / variance;
    const band = 2 / Math.sqrt(n);
    return { lag, correlation, band, significant: Math.abs(correlation) > band };
  });
}
