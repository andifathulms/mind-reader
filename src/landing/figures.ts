import { createMachine, createRng, seedFrom, DEFAULT_CONFIG, PREDICTOR_IDS } from '../engine';
import type { Move, PredictorId } from '../engine';
import { createSeer } from '../engine/predictors/seer';
import { createMrm } from '../engine/predictors/mrm';
import { umpire } from '../engine/umpire';

/**
 * Every number on this page is computed by the engine the app ships, on the
 * reader's own device, at the moment they scroll to it. None of it is written
 * into the copy by hand. A landing page for an app about honest measurement
 * cannot quote figures it made up.
 */

export interface WeightRow {
  id: PredictorId;
  weight: number;
}

/**
 * A stand-in player who alternates more often than chance.
 *
 * This is not a model of a person and is not offered as one. It is the single
 * most common way a human fails to be random, and it is enough to make the
 * ensemble visibly pick a side, which is what the band underneath it shows.
 */
function overAlternating(rounds: number, seed: number): Move[] {
  const rng = createRng(seed);
  const moves: Move[] = [];
  let previous: Move = 0;
  for (let index = 0; index < rounds; index += 1) {
    const flip = rng.next() < 0.62;
    previous = (flip ? 1 - previous : previous) as Move;
    moves.push(previous);
  }
  return moves;
}

/** Where the mixer's weight has settled after watching that player for a while. */
export function settledWeights(rounds = 400): { rows: WeightRow[]; rate: number } {
  const machine = createMachine(DEFAULT_CONFIG, seedFrom(0));
  let won = 0;
  let judged = 0;

  for (const move of overAlternating(rounds, 20_250_905)) {
    const seal = machine.referee.seal();
    const round = machine.referee.resolve(seal, move);
    if (round.wasRandom) continue;
    judged += 1;
    if (round.machineWon) won += 1;
  }

  const { weights } = machine.weights();
  const rows = PREDICTOR_IDS.map((id) => ({ id, weight: weights.get(id) ?? 0 }));
  return { rows, rate: judged === 0 ? 0.5 : won / judged };
}

/**
 * The 1953 rematch, replayed. Hagelbarger recorded the small machine beating
 * the large one about 55 to 45; the reconstruction is asked the same question
 * here rather than being told the answer.
 *
 * Both umpire roles are played, because which machine the umpire turned around
 * is not in the sources (see predictors/NOTES.md).
 */
export function rematch(rounds = 2_000, seeds: readonly number[] = [1, 2, 3, 5]): number {
  let mrmPoints = 0;
  let total = 0;
  for (const seed of seeds) {
    const asMatcher = umpire(
      createMrm(createRng(seed)),
      createSeer(createRng(seed * 7 + 1)),
      rounds,
    );
    mrmPoints += asMatcher.matcherScore;
    total += rounds;

    const asMismatcher = umpire(
      createSeer(createRng(seed * 3 + 5)),
      createMrm(createRng(seed)),
      rounds,
    );
    mrmPoints += asMismatcher.mismatcherScore;
    total += rounds;
  }
  return mrmPoints / total;
}
