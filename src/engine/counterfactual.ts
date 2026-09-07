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

/** One setting, swept across values, against a sequence that is already fixed. */
export interface SweepPoint {
  value: number;
  display: string;
  machineWins: number;
  rate: number;
  /** The value the session was actually played at. */
  current: boolean;
}

export interface Sweep {
  setting: 'confidenceFloor' | 'decay' | 'minRounds';
  label: string;
  /** Why this control moves the score, said where the numbers are. */
  note: string;
  points: SweepPoint[];
}

const FLOORS = [0.5, 0.55, 0.65, 0.75, 0.85, 0.95];
const DECAYS = [0.5, 0.8, 0.9, 0.95, 0.99];
const WARMUPS = [0, 10, 20, 50, 100];

/**
 * The same presses, replayed at other settings.
 *
 * Every control in the app restarts the session, for a good reason: weights
 * built under one set of settings mean nothing read under another. The cost is
 * that the most natural question a player has after losing — would it have done
 * that with a lower floor? — could only be answered by throwing away the
 * session that provoked it.
 *
 * The rematch already replays a fixed sequence against other machines. This is
 * the same move across settings instead, and it carries the same caveat, which
 * is not a footnote: against a machine tuned differently you would have pressed
 * differently. These are scores against a frozen sequence, not scores against
 * you.
 */
export function sweepSettings(history: readonly Move[], config: Config, seed: number): Sweep[] {
  const run = (next: Partial<Config>): { machineWins: number; rate: number } => {
    const machine = createMachine({ ...config, ...next }, seed);
    let machineWins = 0;
    for (const move of history) {
      const round = machine.referee.resolve(machine.referee.seal(), move);
      if (round.machineWon) machineWins += 1;
    }
    return {
      machineWins,
      rate: history.length === 0 ? 0.5 : machineWins / history.length,
    };
  };

  const build = (
    setting: Sweep['setting'],
    label: string,
    note: string,
    values: readonly number[],
    display: (v: number) => string,
  ): Sweep => {
    const all = values.includes(config[setting])
      ? [...values]
      : [...values, config[setting]].sort((a, b) => a - b);
    return {
      setting,
      label,
      note,
      points: all.map((value) => {
        const { machineWins, rate } = run({ [setting]: value } as Partial<Config>);
        return {
          value,
          display: display(value),
          machineWins,
          rate,
          current: value === config[setting],
        };
      }),
    };
  };

  return [
    build(
      'confidenceFloor',
      'Confidence threshold',
      'Lower means the machine plays its guess more often: stronger here, and easier to model and beat for anyone who works out its state. This is the trade PRD 4.4 says should be felt rather than described.',
      FLOORS,
      (v) => `${Math.round(v * 100)}%`,
    ),
    build(
      'decay',
      'Weight decay',
      'How fast a model’s record fades. Against a sequence that never changed strategy this moves very little; against one that did, a lower decay follows the change sooner.',
      DECAYS,
      (v) => v.toFixed(2),
    ),
    build(
      'minRounds',
      'Warm-up',
      'Rounds drawn at random before any model is trusted. A longer warm-up spends more of a short session not predicting, which lowers the rate without making the machine any weaker.',
      WARMUPS,
      (v) => `${v}`,
    ),
  ];
}
