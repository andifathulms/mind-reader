import { createMachine } from './index';
import type { Config, Move, PredictorId } from './types';
import { PREDICTOR_IDS } from './types';

export interface Counterfactual {
  /** A single model playing alone, or the mixture the session was played against. */
  id: PredictorId | 'ensemble';
  machineWins: number;
  rounds: number;
  rate: number;
}

/**
 * The session's own presses, replayed against each machine on its own.
 *
 * This is what the app has never been able to say. It spends a whole section on
 * Shannon's machine beating Hagelbarger's and then asks the reader to take on
 * faith that the difference would show up against them.
 *
 * **This is a counterfactual and the interface has to keep saying so.** It is
 * not "SEER would have beaten you 62% of the time". Against a different
 * opponent you would have pressed differently: your presses were partly a
 * response to what the mixture was doing to you, and a different machine would
 * have provoked a different sequence. The only honest reading is "against this
 * frozen sequence, SEER scores 62%", and the moment that caveat is dropped the
 * figure becomes a lie.
 *
 * Each model is replayed through the same machinery it would have run in: the
 * same warm-up, the same confidence floor, the same seeded generator. That is
 * what the Controls already do when a player selects one predictor (PRD §4.1),
 * so this is the app's own configuration path rather than a special case built
 * for a table.
 */
export function replayAgainstEach(
  history: readonly Move[],
  config: Config,
  seed: number,
): Counterfactual[] {
  const run = (active: PredictorId[], id: PredictorId | 'ensemble'): Counterfactual => {
    const machine = createMachine({ ...config, active }, seed);
    let machineWins = 0;
    for (const move of history) {
      const round = machine.referee.resolve(machine.referee.seal(), move);
      if (round.machineWon) machineWins += 1;
    }
    return {
      id,
      machineWins,
      rounds: history.length,
      rate: history.length === 0 ? 0.5 : machineWins / history.length,
    };
  };

  return [
    run([...config.active], 'ensemble'),
    ...PREDICTOR_IDS.map((id) => run([id], id)),
  ];
}
