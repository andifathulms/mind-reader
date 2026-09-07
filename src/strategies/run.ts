import { createMachine } from '../engine';
import { createRng } from '../engine/rng';
import type { Rng } from '../engine/rng';
import type { Config, Move } from '../engine/types';
import type { Strategy } from './index';

export interface StrategyResult {
  id: string;
  rounds: number;
  machineWins: number;
  rate: number;
}

/**
 * Run a scripted strategy against a fresh machine.
 *
 * The lab reports what the strategy does, not what a person managed to do while
 * trying to follow it. Those are different numbers and the difference is the
 * point — a player can read this table, understand it completely, and still not
 * reproduce the coin's row from their own head.
 */
export function runStrategy(
  strategy: Strategy,
  config: Config,
  seed: number,
  rounds = 500,
): StrategyResult {
  const machine = createMachine(config, seed);
  const rng = createRng(seed ^ 0x9e3779b9);
  const history: Move[] = [];
  let machineWins = 0;

  for (let i = 0; i < rounds; i += 1) {
    const seal = machine.referee.seal();
    const move = strategy.play(history, rng);
    const round = machine.referee.resolve(seal, move);
    history.push(move);
    if (round.machineWon) machineWins += 1;
  }

  return { id: strategy.id, rounds, machineWins, rate: machineWins / rounds };
}

/** One press that departed from the rule the player said they were following. */
export interface Departure {
  /** Position within the attempt, from zero. The caller knows where it began. */
  step: number;
  expected: Move;
  played: Move;
}

export interface Trace {
  presses: number;
  departures: Departure[];
  /** How many presses were made before the first departure. */
  heldFor: number;
  /** True where the opening press was taken as given rather than checked. */
  openingGiven: boolean;
}

/**
 * A generator that refuses to generate.
 *
 * `traceAttempt` is only meaningful for a rule that fixes the next press from
 * the history alone. Rather than trusting the `deterministic` flag, the trace
 * hands the strategy a source that throws if touched, so a rule that quietly
 * reaches for randomness fails loudly instead of producing a trace of
 * departures from a coin.
 */
const REFUSES: Rng = {
  next: () => {
    throw new Error('A traced strategy drew from the generator: its next press is not defined.');
  },
  bit: () => {
    throw new Error('A traced strategy drew from the generator: its next press is not defined.');
  },
  below: () => {
    throw new Error('A traced strategy drew from the generator: its next press is not defined.');
  },
  snapshot: () => {
    throw new Error('Not a real generator.');
  },
  restore: () => {
    throw new Error('Not a real generator.');
  },
};

/**
 * Where a player departed from the rule they said they were following.
 *
 * The lab already reports what the script scores and what the player scored
 * attempting it. Those two numbers state that a gap exists; this says where it
 * opened.
 *
 * At each step the rule is asked what it would play *given the presses the
 * player has actually made so far*, not given its own ideal line. That matters:
 * it flags each departure separately rather than declaring everything after the
 * first mistake wrong, so a player who slipped once and recovered reads as
 * having slipped once.
 *
 * For the rules that walk a fixed sequence, pi and the passage, the position is
 * the number of presses made since the attempt began. The trace therefore
 * assumes the player started at the beginning and did not lose their place,
 * which is exactly the thing those two verdicts say is hard, so a run of
 * departures from some point on is the finding rather than a fault in the
 * reading.
 *
 * An unanchored rule is one about the relation between presses rather than an
 * absolute sequence, so its opening press cannot be wrong: alternation has no
 * preferred foot and a player who begins on the right has broken nothing. For
 * those the first press is taken as given and the trace starts at the second.
 */
export function traceAttempt(strategy: Strategy, presses: readonly Move[]): Trace | null {
  if (!strategy.deterministic) return null;

  const departures: Departure[] = [];
  const start = strategy.anchored ? 0 : 1;
  const seen: Move[] = presses.slice(0, start);

  for (let step = start; step < presses.length; step += 1) {
    const played = presses[step] as Move;
    const expected = strategy.play(seen, REFUSES);
    if (expected !== played) departures.push({ step, expected, played });
    seen.push(played);
  }

  return {
    presses: presses.length,
    departures,
    heldFor: departures[0]?.step ?? presses.length,
    /** True where the opening press was taken as given rather than checked. */
    openingGiven: start === 1 && presses.length > 0,
  };
}
