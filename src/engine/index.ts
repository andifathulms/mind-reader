import { createRng, seedFrom } from './rng';
import type { Rng } from './rng';
import { createMixer } from './mixer';
import type { MixerState } from './mixer';
import { Referee } from './referee';
import { createNgram } from './predictors/ngram';
import { createBackoff } from './predictors/backoff';
import { createSeer } from './predictors/seer';
import { createMrm } from './predictors/mrm';
import { createLevelK } from './predictors/levelk';
import type { Predictor } from './predictors/predictor';
import type { Config, PredictorId, Session } from './types';
import { DEFAULT_CONFIG } from './types';

export function createPredictor(id: PredictorId, config: Config, rng: Rng): Predictor {
  switch (id) {
    case 'ngram':
      return createNgram(config.ngramOrder);
    case 'backoff':
      return createBackoff();
    case 'seer':
      return createSeer(rng);
    case 'mrm':
      return createMrm(rng);
    case 'levelk':
      return createLevelK();
  }
}

export interface Machine {
  referee: Referee;
  rng: Rng;
  config: Config;
  seed: number;
  weights(): MixerState;
  session(): Session;
}

export function createMachine(
  config: Config = DEFAULT_CONFIG,
  seed = seedFrom(0),
  now: () => number = () => 0,
): Machine {
  const rng = createRng(seed);
  const predictors = config.active.map((id) => createPredictor(id, config, rng));
  const mixer = createMixer(predictors, config, rng);
  const referee = new Referee(mixer, now);

  return {
    referee,
    rng,
    config,
    seed,
    weights: () => mixer.state(),
    session: () => ({ seed, rounds: [...referee.getRounds()], config }),
  };
}

export * from './types';
export * from './rng';
export * from './referee';
export { createMixer } from './mixer';
export { umpire } from './umpire';
export type { Match, Exchange } from './umpire';
export type { Predictor, Guess } from './predictors/predictor';
