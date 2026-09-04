import type { Citation, Move, PredictorId } from '../types';

export interface Guess {
  guess: Move;
  /** 0..1. 0 means "no basis"; the mixer reads this as an abstention. */
  confidence: number;
}

/**
 * The input to `predict` is the player's press history and nothing else.
 *
 * That is not a convention, it is the enforcement of PRD §7.3: there is nowhere
 * to pass timing, cursor position or tap coordinates even if someone wanted to.
 * Widening this signature would be a change to what the app claims about itself.
 */
export interface Predictor {
  id: PredictorId;
  name: string;
  /** Non-null for the reconstructions; null where the model is modern. */
  citation: Citation | null;
  reset(): void;
  /** History is the player's presses, oldest first. */
  predict(history: readonly Move[]): Guess;
  observe(actual: Move): void;
}

/** No basis for a guess. The bit is arbitrary and the mixer must ignore it. */
export function abstain(bit: Move = 0): Guess {
  return { guess: bit, confidence: 0 };
}
