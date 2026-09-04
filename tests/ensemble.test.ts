import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Move, PredictorId } from '../src/engine/types';

/**
 * The ensemble view's claim is that a player who changes strategy can watch the
 * weights redistribute as a different model takes over (PRD §2.3). If the
 * weights never diverge, that view is showing nothing and the claim is false.
 */
function play(presses: readonly Move[]) {
  const machine = createMachine(DEFAULT_CONFIG, 4242);
  for (const press of presses) machine.referee.resolve(machine.referee.seal(), press);
  return machine.weights().weights;
}

const leader = (weights: ReadonlyMap<PredictorId, number>): PredictorId => {
  let best: PredictorId = 'seer';
  for (const [id, w] of weights) if (w > (weights.get(best) ?? 0)) best = id;
  return best;
};

describe('the ensemble weights', () => {
  it('separate rather than sitting at one fifth each', () => {
    // A period-three cycle: the context models can see it, and the two
    // historical machines, whose whole memory is the last two plays, cannot.
    const presses = Array.from({ length: 300 }, (_, i) => ((i % 3 === 0 ? 1 : 0) as Move));
    const weights = play(presses);
    const spread = Math.max(...weights.values()) - Math.min(...weights.values());
    expect(spread).toBeGreaterThan(0.05);
  });

  it('hand the lead to a different model when the player changes strategy', () => {
    const alternating: Move[] = Array.from({ length: 200 }, (_, i) => (i % 2) as Move);
    const cycle: Move[] = Array.from({ length: 200 }, (_, i) => ((i % 5 < 2 ? 1 : 0) as Move));

    const before = leader(play(alternating));
    const after = leader(play([...alternating, ...cycle]));
    expect(after).not.toBe(before);
  });
});
