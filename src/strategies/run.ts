import { createMachine } from '../engine';
import { createRng } from '../engine/rng';
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
