import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { createRng } from '../src/engine/rng';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Config } from '../src/engine/types';

/**
 * The most important test in the suite (PRD §6.2).
 *
 * The machine cannot beat a genuinely random source — if it could, it would be
 * predicting a random sequence, which is a contradiction. A failure here is
 * almost certainly the future leaking into the prediction, and that same bug
 * would be silently inflating the machine's score against humans.
 *
 * If this fails, do not tune it until it passes (CLAUDE.md §5).
 */

const ROUNDS = 100_000;

/** Two-sided sampling error on a fair coin, in wins. */
function tolerance(n: number, sigmas = 4): number {
  return (sigmas * Math.sqrt(n)) / 2;
}

function playAgainstRandom(config: Config, machineSeed: number, playerSeed: number) {
  const machine = createMachine(config, machineSeed);
  const player = createRng(playerSeed);
  let wins = 0;
  let random = 0;
  for (let i = 0; i < ROUNDS; i += 1) {
    const seal = machine.referee.seal();
    const round = machine.referee.resolve(seal, player.bit());
    if (round.machineWon) wins += 1;
    if (round.wasRandom) random += 1;
  }
  return { wins, random, rate: wins / ROUNDS };
}

describe('the machine against a real random source', () => {
  it('converges to 50% over 100,000 rounds', () => {
    const { wins, rate } = playAgainstRandom(DEFAULT_CONFIG, 20240318, 19530318);
    const slack = tolerance(ROUNDS) / ROUNDS;
    expect(Math.abs(rate - 0.5)).toBeLessThan(slack);
    expect(wins).toBeGreaterThan(0);
  });

  it('converges to 50% for every seed pair, not just a lucky one', () => {
    for (const [m, p] of [
      [1, 2],
      [777, 31337],
      [0xbeef, 0xcafe],
      [19560101, 20200101],
    ] as const) {
      const { rate } = playAgainstRandom(DEFAULT_CONFIG, m, p);
      expect(Math.abs(rate - 0.5)).toBeLessThan(tolerance(ROUNDS) / ROUNDS);
    }
  });

  it('falls back to the PRNG constantly against a random source', () => {
    // The confidence floor is the honesty mechanism (PRD §4.4). Against noise
    // the mixture's confidence never sustains, so most rounds are declared
    // random rather than claimed as predictions.
    const { random } = playAgainstRandom(DEFAULT_CONFIG, 4242, 2424);
    expect(random / ROUNDS).toBeGreaterThan(0.9);
  });

  it('holds at 50% with the confidence floor removed', () => {
    // With the floor at 0.5 the machine always plays its guess. It is then
    // stronger against a human and exploitable by anyone who reverse-engineers
    // it, but it still cannot beat a coin — that is game theory, not tuning.
    const config: Config = { ...DEFAULT_CONFIG, confidenceFloor: 0.5, minRounds: 0 };
    const { rate, random } = playAgainstRandom(config, 909, 808);
    expect(random).toBe(0);
    expect(Math.abs(rate - 0.5)).toBeLessThan(tolerance(ROUNDS) / ROUNDS);
  });

  it('holds at 50% for each predictor alone', () => {
    for (const id of DEFAULT_CONFIG.active) {
      const config: Config = { ...DEFAULT_CONFIG, active: [id], confidenceFloor: 0.5, minRounds: 0 };
      const { rate } = playAgainstRandom(config, 5150, 6006);
      expect(Math.abs(rate - 0.5), id).toBeLessThan(tolerance(ROUNDS) / ROUNDS);
    }
  });
});

describe('the machine against a source that is not random', () => {
  it('beats a strict alternator decisively', () => {
    // The counterweight to the tests above: a machine that converges to 50%
    // against everything would pass them by being broken in the other
    // direction.
    const machine = createMachine(DEFAULT_CONFIG, 1);
    let wins = 0;
    for (let i = 0; i < 2000; i += 1) {
      const seal = machine.referee.seal();
      if (machine.referee.resolve(seal, (i % 2) as 0 | 1).machineWon) wins += 1;
    }
    expect(wins / 2000).toBeGreaterThan(0.95);
  });

  it('beats a player with a repeat bias', () => {
    const machine = createMachine(DEFAULT_CONFIG, 2);
    const rng = createRng(99);
    let last: 0 | 1 = 0;
    let wins = 0;
    const n = 20_000;
    for (let i = 0; i < n; i += 1) {
      // Repeats 70% of the time — a mild, entirely human bias.
      last = rng.next() < 0.7 ? last : ((1 - last) as 0 | 1);
      if (machine.referee.resolve(machine.referee.seal(), last).machineWon) wins += 1;
    }
    expect(wins / n).toBeGreaterThan(0.6);
  });
});

describe('the level-k model against a player who is second-guessing', () => {
  it('catches a player who inverts their own instinct', () => {
    // The strategy PRD §5.6 names as the one people reach for once they start
    // losing: form an instinct, then do the opposite. It is a hierarchy one
    // rung up, and the model is built to climb after it.
    const machine = createMachine({ ...DEFAULT_CONFIG, active: ['levelk'] }, 7);
    let last: 0 | 1 = 0;
    let wins = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) {
      // The instinct is to repeat; inverting it produces an alternation the
      // player believes is unpredictable.
      last = (1 - last) as 0 | 1;
      if (machine.referee.resolve(machine.referee.seal(), last).machineWon) wins += 1;
    }
    expect(wins / n).toBeGreaterThan(0.9);
  });
});
