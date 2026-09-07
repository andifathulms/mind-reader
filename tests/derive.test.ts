import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { derive } from '../src/engine/derive';
import { createRng } from '../src/engine/rng';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Move } from '../src/engine/types';

/**
 * The derivation is a reading of a round, not a second opinion about it. If it
 * ever disagrees with what the machine recorded, the interface would be showing
 * a number the machine cannot be held to, which is the one thing PRD §7.4 is
 * there to prevent.
 */
describe('the derivation', () => {
  it('reaches the confidence the machine recorded, every round', () => {
    const machine = createMachine(DEFAULT_CONFIG, 4242);
    const rng = createRng(99);

    for (let i = 0; i < 600; i += 1) {
      const seal = machine.referee.seal();
      // A player with a repeat bias, so the weights actually move and the
      // derivation is exercised over a range of votes rather than a flat one.
      const previous = machine.referee.getHistory().at(-1);
      const move: Move =
        previous === undefined ? rng.bit() : rng.next() < 0.7 ? previous : ((1 - previous) as Move);
      machine.referee.resolve(seal, move);
    }

    const rounds = machine.referee.getRounds();
    expect(rounds).toHaveLength(600);

    for (const round of rounds) {
      const d = derive(round, DEFAULT_CONFIG);
      expect(d.drift).toBeLessThan(1e-9);
    }
  });

  it('points at the move the machine committed to, whenever it was not random', () => {
    const machine = createMachine(DEFAULT_CONFIG, 77);
    const rng = createRng(5);

    for (let i = 0; i < 400; i += 1) {
      const seal = machine.referee.seal();
      const previous = machine.referee.getHistory().at(-1);
      const move: Move =
        previous === undefined ? rng.bit() : rng.next() < 0.75 ? ((1 - previous) as Move) : previous;
      machine.referee.resolve(seal, move);
    }

    const judged = machine.referee.getRounds().filter((r) => !r.wasRandom);
    expect(judged.length).toBeGreaterThan(0);

    for (const round of judged) {
      const d = derive(round, DEFAULT_CONFIG);
      expect(d.believed).toBe(round.prediction);
    }
  });

  it('marks the warm-up rounds as warming up and nothing else', () => {
    const machine = createMachine(DEFAULT_CONFIG, 11);
    const rng = createRng(3);
    for (let i = 0; i < 40; i += 1) {
      machine.referee.resolve(machine.referee.seal(), rng.bit());
    }

    for (const round of machine.referee.getRounds()) {
      const d = derive(round, DEFAULT_CONFIG);
      expect(d.warmingUp).toBe(round.index < DEFAULT_CONFIG.minRounds);
      if (d.warmingUp) expect(round.wasRandom).toBe(true);
    }
  });
});
