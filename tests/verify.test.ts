import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { createRng } from '../src/engine/rng';
import { verifySeals } from '../src/engine/verify';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Move } from '../src/engine/types';

/**
 * The audit the Seal section runs in front of the player. If this can be made
 * to pass on a session whose predictions were not fixed in advance, it is
 * proving nothing and the section is decoration.
 */
function play(rounds: number, seed: number): { rounds: ReturnType<typeof collect> } {
  return { rounds: collect(rounds, seed) };
}

function collect(count: number, seed: number) {
  const machine = createMachine(DEFAULT_CONFIG, seed);
  const rng = createRng(seed ^ 0x1234);
  for (let i = 0; i < count; i += 1) {
    const seal = machine.referee.seal();
    // A player with a repeat bias, so the machine has something to find.
    const previous = machine.referee.getHistory().at(-1);
    const move: Move =
      previous === undefined ? rng.bit() : rng.next() < 0.7 ? previous : ((1 - previous) as Move);
    machine.referee.resolve(seal, move);
  }
  return [...machine.referee.getRounds()];
}

describe('the seal audit', () => {
  it('reproduces every recorded prediction from the presses that preceded it', () => {
    const { rounds } = play(300, 99);
    const audit = verifySeals(rounds, DEFAULT_CONFIG, 99);
    expect(audit.checks).toHaveLength(300);
    expect(audit.allMatch).toBe(true);
    expect(audit.firstMismatch).toBeNull();
  });

  it('seals each round from strictly fewer presses than the round it predicts', () => {
    const { rounds } = play(50, 7);
    const audit = verifySeals(rounds, DEFAULT_CONFIG, 7);
    for (const check of audit.checks) {
      expect(check.historyLength).toBe(check.index);
    }
  });

  it('reports a mismatch rather than passing quietly when a prediction is altered', () => {
    const { rounds } = play(60, 11);
    const tampered = rounds.map((r, i) =>
      i === 42 ? { ...r, prediction: (1 - r.prediction) as Move } : r,
    );
    const audit = verifySeals(tampered, DEFAULT_CONFIG, 11);
    expect(audit.allMatch).toBe(false);
    expect(audit.firstMismatch).toBe(42);
  });

  it('is not satisfied by a different seed', () => {
    const { rounds } = play(120, 5);
    const audit = verifySeals(rounds, DEFAULT_CONFIG, 6);
    expect(audit.allMatch).toBe(false);
  });
});
