import type { Citation, Move, PredictorId } from '../types';

export interface Guess {
  guess: Move;
  /** 0..1. 0 means "no basis"; the mixer reads this as an abstention. */
  confidence: number;
}

/**
 * The input to `predict` is two press histories and nothing else: the
 * player's, and the machine's own committed moves over the same rounds.
 *
 * That is not a convention, it is the enforcement of PRD §7.3: there is nowhere
 * to pass timing, cursor position or tap coordinates even if someone wanted to.
 * The machine's moves were added deliberately and are disclosed in the Archive:
 * each one was shown to the player when it was revealed, so they are public,
 * and they are what lets a model see whether the player just won or lost.
 * Widening this signature again would be a change to what the app claims about
 * itself.
 */
export interface Predictor {
  id: PredictorId;
  name: string;
  /** Non-null for the reconstructions; null where the model is modern. */
  citation: Citation | null;
  reset(): void;
  /**
   * `history` is the player's presses, oldest first. `own` is the machine's
   * committed moves for the same rounds, so `own[i]` is what was sealed against
   * `history[i]`. Most models ignore it.
   */
  predict(history: readonly Move[], own: readonly Move[]): Guess;
  observe(actual: Move): void;
  /** The state behind the most recent `predict`, for the reader. Optional: a
      model with nothing to show returns null rather than inventing a story. */
  explain?(): Explanation | null;
}

/**
 * What a model was looking at when it last committed.
 *
 * PRD §3 rejects a stronger model on the grounds that it "would win more and
 * explain less". The five kept instead were chosen for being explicable, and
 * were then shown to the player as a name, a colour and a weight. This is the
 * inside of one, in its own terms.
 *
 * Read-only, and read after the fact. Nothing here is passed to another model
 * or back into `predict`: a predictor that could see this would be a different
 * algorithm from the one it is named after (CLAUDE.md §3).
 */
export interface Explanation {
  /** The internal case the model was in. */
  situation: string;
  /** The evidence it was holding there, with its numbers. */
  evidence: string;
}

/** No basis for a guess. The bit is arbitrary and the mixer must ignore it. */
export function abstain(bit: Move = 0): Guess {
  return { guess: bit, confidence: 0 };
}
