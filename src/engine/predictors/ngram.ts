import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';
import { abstain } from './predictor';
import type { Explanation } from './predictor';

/**
 * Fixed-order n-gram. The Aaronson-style baseline: a count table over the last
 * n presses, predicting whichever move followed that context most often.
 *
 * Counts decay, so a player who changes strategy is not held to a table built
 * from the strategy they abandoned. Without that the model is unbeatably stale
 * by round 200 and the ensemble view has nothing to show.
 */
const DECAY = 0.995;

export function createNgram(order = 5): Predictor {
  let table = new Map<string, [number, number]>();
  let history: Move[] = [];
  /** The context the last prediction was made from, for the reader. */
  let lastKey: string | null = null;

  const key = (h: readonly Move[], n: number): string | null =>
    h.length < n ? null : h.slice(h.length - n).join('');

  return {
    id: 'ngram',
    name: `N-gram, order ${order}`,
    citation: null,

    reset() {
      table = new Map();
      history = [];
      lastKey = null;
    },

    predict(h: readonly Move[]): Guess {
      const k = key(h, order);
      lastKey = k;
      if (k === null) return abstain();
      const counts = table.get(k);
      if (!counts) return abstain();

      const [zero, one] = counts;
      const total = zero + one;
      if (total < 1) return abstain();

      const guess: Move = one > zero ? 1 : zero > one ? 0 : ((h[h.length - 1] ?? 0) as Move);
      const p = Math.max(zero, one) / total;
      // A context seen twice is not evidence of much. Temper the raw frequency
      // by how much of it there is.
      const support = total / (total + 2);
      return { guess, confidence: zero === one ? 0 : (2 * p - 1) * support };
    },

    explain(): Explanation | null {
      if (lastKey === null) {
        return {
          situation: `Waiting for ${order} presses`,
          evidence: 'A context this long has not happened yet, so it abstained.',
        };
      }
      const counts = table.get(lastKey);
      const show = (k: string) => k.replace(/0/g, 'L').replace(/1/g, 'R');
      if (!counts) {
        return {
          situation: `Context ${show(lastKey)}`,
          evidence: 'Never seen this run of presses before, so it abstained.',
        };
      }
      const [zero, one] = counts;
      return {
        situation: `Context ${show(lastKey)}`,
        evidence: `After this exact run you have gone left ${zero.toFixed(1)} times and right ${one.toFixed(
          1,
        )}, counted with old occurrences fading.`,
      };
    },

    observe(actual: Move) {
      const k = key(history, order);
      if (k !== null) {
        const counts = table.get(k) ?? [0, 0];
        counts[0] *= DECAY;
        counts[1] *= DECAY;
        counts[actual] += 1;
        table.set(k, counts);
      }
      history.push(actual);
    },
  };
}
