import type { Move } from '../types';
import type { Explanation, Guess, Predictor } from './predictor';
import { abstain } from './predictor';

/**
 * Context mixing over every order from 0 to `maxOrder` at once.
 *
 * The n-gram model commits to one context length and the backoff model takes
 * the longest one with enough evidence. This one keeps all of them and weights
 * each by how well it has actually been predicting lately — a Bayesian mixture
 * over context lengths with forgetting, in the family of context-tree weighting
 * (Willems, Shtarkov & Tjalkens, 1995) and PPM (Cleary & Witten, 1984), though
 * much simpler than either.
 *
 * A player whose habit lives at order 2 drags the mixture to order 2; one who
 * changes to a longer pattern drags it up, without the model having to decide
 * in advance how long a pattern is allowed to be.
 */
const DECAY = 0.98;
/** Forgetting on the order weights, so an order that was right long ago loses its lead. */
const FORGET = 0.97;
/** Krichevsky–Trofimov style prior on each context's counts. */
const PRIOR = 0.4;

export function createContextMix(maxOrder = 8): Predictor {
  /**
   * Counts per order, indexed by the context read as a binary number: order n
   * holds 2^n contexts, two counts each. Integer contexts rather than string
   * keys, because this model runs on every press of every replay.
   */
  let tables: Float64Array[] = [];
  /** The last `maxOrder` presses packed into bits, newest in the lowest bit. */
  let recent = 0;
  let length = 0;
  /** Log-weight per order. */
  let logWeights = new Float64Array(maxOrder + 1);
  /** Each order's probability of a right press at the last predict, or NaN where it had no context. */
  let lastP: number[] = [];
  let lastMix = 0.5;

  const fresh = () => {
    tables = Array.from({ length: maxOrder + 1 }, (_, n) => new Float64Array(2 << n));
    recent = 0;
    length = 0;
    logWeights = new Float64Array(maxOrder + 1);
    lastP = [];
    lastMix = 0.5;
  };
  fresh();

  /** The slot of the order-n context in its table, or -1 where there is not one yet. */
  const slot = (n: number): number => (length < n ? -1 : (recent & ((1 << n) - 1)) * 2);

  const orderProbabilities = (): number[] =>
    Array.from({ length: maxOrder + 1 }, (_, n) => {
      const at = slot(n);
      if (at < 0) return Number.NaN;
      const table = tables[n];
      const zero = table?.[at] ?? 0;
      const one = table?.[at + 1] ?? 0;
      return (one + PRIOR) / (zero + one + 2 * PRIOR);
    });

  return {
    id: 'context',
    name: `Context mix, orders 0–${maxOrder}`,
    citation: null,

    reset: fresh,

    /*
     * The model keeps its own copy of the presses as bits, fed by `observe`, so
     * it reads `h` only for its length. The two are the same sequence: the
     * mixer observes every press it predicted.
     */
    predict(h: readonly Move[]): Guess {
      lastP = orderProbabilities();
      let top = Number.NEGATIVE_INFINITY;
      lastP.forEach((p, n) => {
        if (!Number.isNaN(p)) top = Math.max(top, logWeights[n] ?? 0);
      });
      let num = 0;
      let den = 0;
      lastP.forEach((p, n) => {
        if (Number.isNaN(p)) return;
        const w = Math.exp((logWeights[n] ?? 0) - top);
        num += w * p;
        den += w;
      });
      lastMix = den > 0 ? num / den : 0.5;
      if (h.length === 0 || lastMix === 0.5) return abstain();
      return { guess: lastMix > 0.5 ? 1 : 0, confidence: Math.abs(2 * lastMix - 1) };
    },

    explain(): Explanation | null {
      let best = -1;
      let top = Number.NEGATIVE_INFINITY;
      lastP.forEach((p, n) => {
        if (!Number.isNaN(p) && (logWeights[n] ?? 0) > top) {
          top = logWeights[n] ?? 0;
          best = n;
        }
      });
      if (best < 0) {
        return { situation: 'No press to condition on yet', evidence: 'It abstained.' };
      }
      return {
        situation: `Leaning on order ${best}`,
        evidence: `It blends every context length from 0 to ${maxOrder}, each weighted by how well it has been predicting you. Order ${best} leads right now, and the blend puts right at ${Math.round(
          lastMix * 100,
        )}%.`,
      };
    },

    observe(actual: Move) {
      // Score each order on the press that just arrived, then learn from it.
      const ps = lastP.length === maxOrder + 1 ? lastP : orderProbabilities();
      ps.forEach((p, n) => {
        if (Number.isNaN(p)) return;
        const likelihood = actual === 1 ? p : 1 - p;
        logWeights[n] = (logWeights[n] ?? 0) * FORGET + Math.log(2 * likelihood);
      });
      for (let n = 0; n <= maxOrder; n += 1) {
        const at = slot(n);
        const table = tables[n];
        if (at < 0 || !table) continue;
        table[at] = (table[at] ?? 0) * DECAY;
        table[at + 1] = (table[at + 1] ?? 0) * DECAY;
        table[at + actual] = (table[at + actual] ?? 0) + 1;
      }
      recent = ((recent << 1) | actual) & ((1 << maxOrder) - 1);
      length += 1;
      lastP = [];
    },
  };
}
