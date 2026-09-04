import { describe, expect, it } from 'vitest';
import { createRng } from '../src/engine/rng';
import { createSeer } from '../src/engine/predictors/seer';
import { createMrm } from '../src/engine/predictors/mrm';
import { umpire } from '../src/engine/umpire';

/**
 * Hagelbarger, 1956: "After much discussion an umpire machine was built which
 * connected the two machines, and they were allowed to play several thousand
 * games. The agility of the small machine triumphed, and it beat the larger one
 * about 55-45."
 *
 * If MRM does not finish ahead here, one of the two implementations is wrong
 * (PRD §6.1). This is a validation of the reconstruction, not a tuning target.
 */

const ROUNDS = 10_000;

/** MRM's score share, averaged over both umpire roles and several seeds. */
function mrmShare(rounds: number, seeds: readonly number[]): number {
  let mrmPoints = 0;
  let total = 0;
  for (const seed of seeds) {
    // Which machine the umpire turns around is not recorded in the sources, so
    // both assignments are played and averaged.
    const asMatcher = umpire(createMrm(createRng(seed)), createSeer(createRng(seed * 7 + 1)), rounds);
    mrmPoints += asMatcher.matcherScore;
    total += rounds;

    const asMismatcher = umpire(createSeer(createRng(seed * 3 + 5)), createMrm(createRng(seed)), rounds);
    mrmPoints += asMismatcher.mismatcherScore;
    total += rounds;
  }
  return mrmPoints / total;
}

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

describe('the 1953 rematch', () => {
  it('MRM finishes ahead of SEER over 10,000 rounds', () => {
    expect(mrmShare(ROUNDS, SEEDS)).toBeGreaterThan(0.5);
  });

  it('MRM wins in each individual role, not only on average', () => {
    const asMatcher = umpire(createMrm(createRng(101)), createSeer(createRng(202)), ROUNDS);
    expect(asMatcher.matcherScore).toBeGreaterThan(asMatcher.mismatcherScore);

    const asMismatcher = umpire(createSeer(createRng(303)), createMrm(createRng(404)), ROUNDS);
    expect(asMismatcher.mismatcherScore).toBeGreaterThan(asMismatcher.matcherScore);
  });

  it('MRM wins most individual games, not one lopsided run', () => {
    let games = 0;
    let won = 0;
    for (const seed of SEEDS) {
      const match = umpire(createMrm(createRng(seed)), createSeer(createRng(seed + 1000)), 200);
      games += 1;
      if (match.matcherScore > match.mismatcherScore) won += 1;
    }
    expect(won / games).toBeGreaterThan(0.5);
  });
});

describe('both machines against a coin', () => {
  it('neither beats a random source', () => {
    for (const make of [createSeer, createMrm]) {
      const machine = make(createRng(11));
      const coin = createRng(22);
      const seen: number[] = [];
      let wins = 0;
      const n = 50_000;
      for (let i = 0; i < n; i += 1) {
        const guess = machine.predict(seen as never).guess;
        const actual = coin.bit();
        if (guess === actual) wins += 1;
        machine.observe(actual);
        seen.push(actual);
      }
      expect(Math.abs(wins / n - 0.5)).toBeLessThan(0.01);
    }
  });
});
