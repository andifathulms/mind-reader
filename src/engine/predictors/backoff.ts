import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';
import { abstain } from './predictor';
import type { Explanation } from './predictor';

/**
 * Variable-order context model. Tries the longest context first and falls back
 * through shorter ones until it finds one with enough evidence.
 *
 * This is the model that survives a strategy change fastest: when a long
 * context goes cold the short ones are still populated, so it degrades to a
 * weaker prediction rather than to none.
 */
const MAX_ORDER = 5;
const MIN_EVIDENCE = 3;
const DECAY = 0.995;

export function createBackoff(maxOrder = MAX_ORDER): Predictor {
  let tables: Array<Map<string, [number, number]>> = [];
  let history: Move[] = [];
  /** Which order the last prediction actually came from, and on what. */
  let landed: { order: number; key: string; zero: number; one: number } | null = null;

  const fresh = () => Array.from({ length: maxOrder + 1 }, () => new Map<string, [number, number]>());

  const context = (h: readonly Move[], n: number): string | null =>
    h.length < n ? null : h.slice(h.length - n).join('');

  tables = fresh();

  return {
    id: 'backoff',
    name: 'Backoff, variable order',
    citation: null,

    reset() {
      tables = fresh();
      history = [];
    },

    predict(h: readonly Move[]): Guess {
      landed = null;
      for (let n = maxOrder; n >= 0; n -= 1) {
        const k = context(h, n);
        if (k === null) continue;
        const counts = tables[n]?.get(k);
        if (!counts) continue;
        const [zero, one] = counts;
        const total = zero + one;
        if (total < MIN_EVIDENCE || zero === one) continue;

        const p = Math.max(zero, one) / total;
        // Longer contexts are worth more when they fire at all, so a hit at
        // order 5 outranks a hit at order 1 even at the same frequency.
        const depth = (n + 1) / (maxOrder + 1);
        const support = total / (total + 2);
        landed = { order: n, key: k, zero, one };
        return { guess: (one > zero ? 1 : 0) as Move, confidence: (2 * p - 1) * support * depth };
      }
      return abstain();
    },

    explain(): Explanation | null {
      if (!landed) {
        return {
          situation: `Fell through all ${maxOrder + 1} orders`,
          evidence: `No context from ${maxOrder} presses down to none had ${MIN_EVIDENCE} clear occurrences behind it, so it abstained.`,
        };
      }
      const show = (k: string) => (k === '' ? 'no context' : k.replace(/0/g, 'L').replace(/1/g, 'R'));
      return {
        situation: `Stopped at order ${landed.order}, on ${show(landed.key)}`,
        evidence: `It tries ${maxOrder} presses of context first and shortens until one has enough behind it. Here: left ${landed.zero.toFixed(
          1,
        )}, right ${landed.one.toFixed(1)}.`,
      };
    },

    observe(actual: Move) {
      for (let n = 0; n <= maxOrder; n += 1) {
        const k = context(history, n);
        if (k === null) continue;
        const table = tables[n];
        if (!table) continue;
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
