import { describe, expect, it } from 'vitest';
import { Referee, SealError } from '../src/engine/referee';
import type { Oracle } from '../src/engine/referee';
import type { Move } from '../src/engine/types';
import { createRng } from '../src/engine/rng';

/**
 * An oracle that would cheat if it could: it commits to whatever the majority of
 * history was, and counts how often it is asked. The tests below use the count
 * to prove `resolve` never asks it for a prediction.
 */
function countingOracle(): Oracle & { commits: number } {
  let seen: Move[] = [];
  return {
    commits: 0,
    commit(history) {
      this.commits += 1;
      const ones = history.filter((m) => m === 1).length;
      return {
        move: (ones * 2 > history.length ? 1 : 0) as Move,
        confidence: history.length / (history.length + 4),
        wasRandom: false,
        perPredictor: [],
      };
    },
    learn(actual) {
      seen.push(actual);
    },
    reset() {
      seen = [];
    },
  };
}

const clock = () => 0;

describe('the commitment protocol', () => {
  it('refuses a press that has no seal behind it', () => {
    const referee = new Referee(countingOracle(), clock);
    const seal = referee.seal();
    referee.resolve(seal, 1);
    expect(() => referee.resolve(seal, 1)).toThrow(SealError);
  });

  it('refuses a stale seal', () => {
    const referee = new Referee(countingOracle(), clock);
    const first = referee.seal();
    referee.resolve(first, 0);
    referee.seal();
    expect(() => referee.resolve(first, 0)).toThrow(SealError);
  });

  it('commits the same move whatever the player then presses', () => {
    for (const actual of [0, 1] as const) {
      const referee = new Referee(countingOracle(), clock);
      for (const m of [1, 1, 0, 1, 1] as const) referee.resolve(referee.seal(), m);
      const seal = referee.seal();
      const committed = seal.commit;
      const round = referee.resolve(seal, actual);
      expect(round.prediction).toBe(committed);
    }
  });

  it('never computes a prediction during resolve', () => {
    const oracle = countingOracle();
    const referee = new Referee(oracle, clock);
    for (let i = 0; i < 50; i += 1) {
      referee.seal();
      expect(oracle.commits).toBe(i + 1);
      referee.resolve(referee.currentSeal!, (i % 3 === 0 ? 1 : 0) as Move);
      // resolve asked for nothing.
      expect(oracle.commits).toBe(i + 1);
    }
  });

  it('is sealed only between commit and press', () => {
    const referee = new Referee(countingOracle(), clock);
    expect(referee.isSealed).toBe(false);
    const seal = referee.seal();
    expect(referee.isSealed).toBe(true);
    referee.resolve(seal, 1);
    expect(referee.isSealed).toBe(false);
  });

  it('replays identically from the same seed', () => {
    const presses: Move[] = Array.from({ length: 200 }, (_, i) => ((i * 7) % 5 < 2 ? 1 : 0));

    const play = () => {
      const rng = createRng(12345);
      const oracle: Oracle = {
        commit: () => ({
          move: rng.bit(),
          confidence: rng.next(),
          wasRandom: true,
          perPredictor: [],
        }),
        learn: () => {},
        reset: () => {},
      };
      const referee = new Referee(oracle, clock);
      return presses.map((p) => referee.resolve(referee.seal(), p));
    };

    expect(play()).toEqual(play());
  });
});
