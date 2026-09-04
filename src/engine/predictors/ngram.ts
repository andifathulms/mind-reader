import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';
import { abstain } from './predictor';

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

  const key = (h: readonly Move[], n: number): string | null =>
    h.length < n ? null : h.slice(h.length - n).join('');

  return {
    id: 'ngram',
    name: `N-gram, order ${order}`,
    citation: null,

    reset() {
      table = new Map();
      history = [];
    },

    predict(h: readonly Move[]): Guess {
      const k = key(h, order);
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
