import type { Move } from '../engine/types';

/**
 * Conditional entropy of the next press given the previous `order` presses, in
 * bits per press. Order 0 is the plain entropy of the sequence.
 *
 * This is where the predictability actually lives, and unlike a win rate it is
 * a property of the player's sequence alone — it does not depend on how well
 * the machine happened to do. A fair coin sits at 1 bit at every order. A
 * person is usually below 1 at order 1 and falls further with each order.
 *
 * The plug-in estimator is biased downward: with few samples, contexts look
 * more predictable than they are, and at order 5 on a short sequence every
 * context is unique and the estimate collapses to zero. The Miller correction
 * is applied for that, and `reliable` says whether there is enough sequence for
 * the number to mean anything at all. The portrait must not present an artefact
 * of a small sample as a finding (PRD §7.4).
 */
export interface EntropyPoint {
  order: number;
  bits: number;
  /** Distinct contexts observed. */
  contexts: number;
  /** At least this many samples per context before the figure is worth showing. */
  reliable: boolean;
}

const SAMPLES_PER_CONTEXT = 8;

export function conditionalEntropy(sequence: readonly Move[], order: number): EntropyPoint {
  const samples = sequence.length - order;
  const possible = 2 ** order;

  if (samples <= 0) {
    return { order, bits: 1, contexts: 0, reliable: false };
  }

  const counts = new Map<string, [number, number]>();
  for (let i = order; i < sequence.length; i += 1) {
    const context = order === 0 ? '' : sequence.slice(i - order, i).join('');
    const next = sequence[i];
    if (next === undefined) continue;
    const pair = counts.get(context) ?? [0, 0];
    pair[next] += 1;
    counts.set(context, pair);
  }

  let bits = 0;
  for (const [zero, one] of counts.values()) {
    const total = zero + one;
    if (total === 0) continue;
    let h = 0;
    for (const c of [zero, one]) {
      if (c === 0) continue;
      const p = c / total;
      h -= p * Math.log2(p);
    }
    bits += (total / samples) * h;
  }

  // Miller-Madow: the plug-in estimate is low by (bins - 1) / (2 N ln 2) per
  // context. Without it, a short sequence looks far more predictable than it is.
  const correction = counts.size / (2 * samples * Math.LN2);
  const corrected = Math.min(1, bits + correction);

  return {
    order,
    bits: corrected,
    contexts: counts.size,
    reliable: samples >= SAMPLES_PER_CONTEXT * Math.min(possible, counts.size || 1),
  };
}

/** Orders 0 through 5, the staircase the portrait draws. */
export function entropyStaircase(sequence: readonly Move[], maxOrder = 5): EntropyPoint[] {
  return Array.from({ length: maxOrder + 1 }, (_, order) => conditionalEntropy(sequence, order));
}
