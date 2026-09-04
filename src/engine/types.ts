/** A press. Matching pennies is binary; 0 is left, 1 is right. */
export type Move = 0 | 1;

export const LEFT: Move = 0;
export const RIGHT: Move = 1;

export type PredictorId = 'seer' | 'mrm' | 'ngram' | 'backoff' | 'levelk';

export const PREDICTOR_IDS: readonly PredictorId[] = ['seer', 'mrm', 'ngram', 'backoff', 'levelk'];

export interface Citation {
  author: string;
  title: string;
  where: string;
  year: number;
  /** Null where the predictor is a modern construction with no single source. */
  url: string | null;
}

export interface PerPredictorRecord {
  id: PredictorId;
  /** What this model would have played, whether or not it drove the mixture. */
  guess: Move;
  /** Its own strength of belief, 0 (abstaining) to 1 (certain), before mixing. */
  confidence: number;
  /** Its weight in the mixture at commit time. */
  weight: number;
  /** Whether its own guess turned out to match the player. Filled in on resolve. */
  correct: boolean;
}

export interface Round {
  index: number;
  /** What the machine committed to, before the press was read. */
  prediction: Move;
  actual: Move;
  machineWon: boolean;
  /**
   * The machine's own probability that its commit is right, at commit time.
   * 0.5 is no information; 1.0 is certainty.
   */
  confidence: number;
  /** The machine fell below the confidence floor, or was still warming up. */
  wasRandom: boolean;
  perPredictor: PerPredictorRecord[];
}

export interface MixerConfig {
  /** Exponential weight decay. */
  decay: number;
  /**
   * How sure the machine must be before it claims a guess. Below this it plays
   * a fair bit from the seeded PRNG. 0.5 means it never abstains.
   */
  confidenceFloor: number;
  /** Warm-up: rounds played uniformly at random before any model is trusted. */
  minRounds: number;
}

export interface Config extends MixerConfig {
  /**
   * Which predictors are in the mixture. A single id lets a player face one
   * machine alone, which the archive and the strategy lab both need.
   */
  active: PredictorId[];
  /** N-gram order. */
  ngramOrder: number;
}

export interface Session {
  seed: number;
  rounds: Round[];
  config: Config;
}

export const DEFAULT_CONFIG: Config = {
  decay: 0.95,
  confidenceFloor: 0.55,
  minRounds: 20,
  // Extended as each predictor lands; the fairness gate widens with it.
  active: ['ngram', 'backoff'],
  ngramOrder: 5,
};
