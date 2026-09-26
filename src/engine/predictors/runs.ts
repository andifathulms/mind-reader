import type { Move } from '../types';
import type { Explanation, Guess, Predictor } from './predictor';
import { abstain } from './predictor';

/**
 * Run length. How likely the player is to switch, given how many times in a
 * row they have just pressed the same side.
 *
 * The best-documented failure of people trying to be random is that they
 * avoid long runs: a fair coin repeats four times in a row one time in eight,
 * and a person almost never lets themselves (Wagenaar, 1972; Bar-Hillel &
 * Wagenaar, 1991). A context model sees this only indirectly, spread across
 * many contexts; this one counts it directly, one number per run length.
 */
const LONGEST = 6;
const DECAY = 0.985;

const runLength = (h: readonly Move[]): number => {
  let run = 1;
  for (let i = h.length - 1; i > 0 && h[i] === h[i - 1]; i -= 1) run += 1;
  return Math.min(run, LONGEST);
};

export function createRuns(): Predictor {
  let switches = new Float64Array(LONGEST + 1);
  let seen = new Float64Array(LONGEST + 1);
  let history: Move[] = [];
  let lastRun: number | null = null;

  return {
    id: 'runs',
    name: 'Run length',
    citation: null,

    reset() {
      switches = new Float64Array(LONGEST + 1);
      seen = new Float64Array(LONGEST + 1);
      history = [];
      lastRun = null;
    },

    predict(h: readonly Move[]): Guess {
      const last = h[h.length - 1];
      if (last === undefined) {
        lastRun = null;
        return abstain();
      }
      const run = runLength(h);
      lastRun = run;
      const total = seen[run] ?? 0;
      const p = ((switches[run] ?? 0) + 1) / (total + 2);
      if (p === 0.5) return abstain();
      const guess = (p > 0.5 ? 1 - last : last) as Move;
      return { guess, confidence: Math.abs(2 * p - 1) * (total / (total + 2)) };
    },

    explain(): Explanation | null {
      if (lastRun === null) {
        return { situation: 'No run yet', evidence: 'There has not been a press to count from.' };
      }
      const label = lastRun === LONGEST ? `${LONGEST} or more` : String(lastRun);
      return {
        situation: `A run of ${label}`,
        evidence: `After a run of ${label} you have switched ${(switches[lastRun] ?? 0).toFixed(
          1,
        )} times out of ${(seen[lastRun] ?? 0).toFixed(1)}, counted with old runs fading.`,
      };
    },

    observe(actual: Move) {
      const last = history[history.length - 1];
      if (last !== undefined) {
        const run = runLength(history);
        switches[run] = (switches[run] ?? 0) * DECAY + (actual !== last ? 1 : 0);
        seen[run] = (seen[run] ?? 0) * DECAY + 1;
      }
      history.push(actual);
    },
  };
}
