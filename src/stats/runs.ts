import type { Move } from '../engine/types';

export interface RunBucket {
  length: number;
  observed: number;
  /** What a fair coin would produce over the same number of runs. */
  expected: number;
}

/**
 * Run-length distribution, against the geometric expectation for a fair coin.
 *
 * In 100 fair flips a run of six is near-certain; human sequences rarely
 * contain one. The histogram falling off a cliff at length four is the single
 * most damning chart in the app, and it is damning precisely because the
 * expected curve is drawn alongside rather than described.
 *
 * A fair coin's runs are geometric: P(run = k) = 2^-k. The expectation is that
 * distribution scaled to the number of runs actually observed, so the two
 * curves are comparable without normalising away the sample size.
 */
export function runLengths(sequence: readonly Move[], maxLength = 8): RunBucket[] {
  const observed = new Map<number, number>();
  let runs = 0;
  let current = 0;
  let previous: Move | null = null;

  for (const move of sequence) {
    if (move === previous) {
      current += 1;
    } else {
      if (previous !== null) {
        observed.set(current, (observed.get(current) ?? 0) + 1);
        runs += 1;
      }
      previous = move;
      current = 1;
    }
  }
  if (previous !== null) {
    observed.set(current, (observed.get(current) ?? 0) + 1);
    runs += 1;
  }

  return Array.from({ length: maxLength }, (_, i) => {
    const length = i + 1;
    // The last bucket collects everything at that length or longer, so no runs
    // are quietly dropped off the end of the chart.
    const isTail = length === maxLength;
    const observedCount = isTail
      ? Array.from(observed.entries()).reduce((n, [k, v]) => (k >= length ? n + v : n), 0)
      : (observed.get(length) ?? 0);
    const probability = isTail ? 2 ** -(length - 1) : 2 ** -length;
    return { length, observed: observedCount, expected: runs * probability };
  });
}

export interface SwitchRate {
  switches: number;
  opportunities: number;
  rate: number;
}

/** Humans alternate substantially more than chance. This is that, measured. */
export function switchRate(sequence: readonly Move[]): SwitchRate {
  let switches = 0;
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i] !== sequence[i - 1]) switches += 1;
  }
  const opportunities = Math.max(0, sequence.length - 1);
  return { switches, opportunities, rate: opportunities === 0 ? 0.5 : switches / opportunities };
}
