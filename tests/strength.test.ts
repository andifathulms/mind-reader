import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { createMixer } from '../src/engine/mixer';
import { createRng } from '../src/engine/rng';
import { Referee } from '../src/engine/referee';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Config, Move } from '../src/engine/types';
import type { Predictor } from '../src/engine/predictors/predictor';

/**
 * The machine's strength against the biases people actually have.
 *
 * fairness.test.ts holds the machine to a draw against a coin. That is the
 * ceiling on honesty; this is the floor on usefulness. A machine that
 * converged to 50% against everyone would pass every fairness test by being
 * useless, and the game would have no arc.
 *
 * The players here are scripted and mild on purpose: each leans one way by a
 * margin a person would not notice in themselves.
 */
type Player = (machineWonLast: boolean | null) => Move;

function play(player: Player, rounds: number, config: Config = DEFAULT_CONFIG, seed = 11): number {
  const machine = createMachine(config, seed);
  let wins = 0;
  let last: boolean | null = null;
  for (let i = 0; i < rounds; i += 1) {
    const seal = machine.referee.seal();
    const round = machine.referee.resolve(seal, player(last));
    last = round.machineWon;
    if (round.machineWon) wins += 1;
  }
  return wins / rounds;
}

const flip = (m: Move) => (1 - m) as Move;

function overAlternator(seed: number): Player {
  const rng = createRng(seed);
  let last: Move = 0;
  // Switches 60% of the time. People asked to be random typically land here.
  return () => (last = rng.next() < 0.6 ? flip(last) : last);
}

function runAvoider(seed: number): Player {
  const rng = createRng(seed);
  let last: Move = 0;
  let run = 1;
  const switchAfter = [0, 0.45, 0.55, 0.8, 0.97];
  return () => {
    const next = rng.next() < (switchAfter[Math.min(run, 4)] ?? 0.97) ? flip(last) : last;
    run = next === last ? run + 1 : 1;
    return (last = next);
  };
}

function winStayLoseShift(seed: number): Player {
  const rng = createRng(seed);
  let last: Move = 0;
  // Losing a round (the machine won) makes a switch more likely; winning one
  // makes a repeat more likely.
  return (machineWon) => {
    if (machineWon === null) return last;
    return (last = rng.next() < (machineWon ? 0.68 : 0.35) ? flip(last) : last);
  };
}

describe('the machine against human-like biases', () => {
  it('beats a mild over-alternator', () => {
    expect(play(overAlternator(1), 20_000)).toBeGreaterThan(0.56);
  });

  it('beats a player who avoids long runs', () => {
    expect(play(runAvoider(2), 20_000)).toBeGreaterThan(0.54);
  });

  it('beats win-stay, lose-shift, which only the reaction model can see', () => {
    const withReaction = play(winStayLoseShift(3), 20_000);
    const without = play(winStayLoseShift(3), 20_000, {
      ...DEFAULT_CONFIG,
      active: DEFAULT_CONFIG.active.filter((id) => id !== 'reaction'),
    });
    expect(withReaction).toBeGreaterThan(0.55);
    // Without the machine's own moves, a reaction to winning and losing is
    // invisible: the rest of the ensemble should gain almost nothing.
    expect(withReaction - without).toBeGreaterThan(0.03);
  });
});

describe("the machine's own moves", () => {
  it('reach a predictor only for rounds already revealed', () => {
    // The move sealed for the current round must never be an input, or a
    // model could be scored on a guess it was allowed to read.
    const seen: Array<[number, number]> = [];
    const spy: Predictor = {
      id: 'reaction',
      name: 'spy',
      citation: null,
      reset() {},
      predict(history, own) {
        seen.push([history.length, own.length]);
        return { guess: 0, confidence: 0 };
      },
      observe() {},
    };
    const rng = createRng(5);
    const referee = new Referee(createMixer([spy], { ...DEFAULT_CONFIG, minRounds: 0 }, rng), () => 0);
    const coin = createRng(6);
    for (let i = 0; i < 50; i += 1) referee.resolve(referee.seal(), coin.bit());
    expect(seen).toHaveLength(50);
    for (const [history, own] of seen) expect(own).toBe(history);
  });

  it('are the moves that were actually sealed', () => {
    const recorded: Move[][] = [];
    const spy: Predictor = {
      id: 'reaction',
      name: 'spy',
      citation: null,
      reset() {},
      predict(_history, own) {
        recorded.push([...own]);
        return { guess: 0, confidence: 0 };
      },
      observe() {},
    };
    const referee = new Referee(createMixer([spy], DEFAULT_CONFIG, createRng(8)), () => 0);
    const coin = createRng(9);
    const committed: Move[] = [];
    for (let i = 0; i < 30; i += 1) {
      const seal = referee.seal();
      committed.push(seal.commit);
      referee.resolve(seal, coin.bit());
    }
    referee.seal();
    expect(recorded.at(-1)).toEqual(committed);
  });
});
