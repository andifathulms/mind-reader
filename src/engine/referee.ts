import type { Move, PerPredictorRecord, Round } from './types';

/**
 * What a sealed prediction records at the moment it is locked. Everything here
 * is readonly: a seal that could be edited between commit and reveal would make
 * the score meaningless.
 */
export interface SealedPrediction {
  readonly commit: Move;
  readonly confidence: number;
  readonly wasRandom: boolean;
  readonly perPredictor: ReadonlyArray<Omit<PerPredictorRecord, 'correct'>>;
  /** The round this seal belongs to. Resolving it against another is refused. */
  readonly index: number;
  /** Length of the history the commit was computed from. */
  readonly historyLength: number;
  /** Injected clock (CLAUDE.md §5). Recorded for the export, never used in play. */
  readonly sealedAt: number;
}

/**
 * The thing that produces predictions. The referee does not know how — it only
 * knows that `commit` runs before the press and `learn` runs after.
 */
export interface Oracle {
  commit(history: readonly Move[]): {
    move: Move;
    confidence: number;
    wasRandom: boolean;
    perPredictor: ReadonlyArray<Omit<PerPredictorRecord, 'correct'>>;
  };
  learn(actual: Move): void;
  reset(): void;
}

export class SealError extends Error {}

/**
 * The commitment protocol (PRD §4.3), and the app's integrity mechanism.
 *
 * `resolve` takes the seal as an argument rather than reading it from internal
 * state, so a round cannot be resolved without a seal that was produced
 * earlier. There is no code path here that computes a prediction during
 * `resolve` — `resolve` never calls `oracle.commit`, and the only move it can
 * record is the one already inside the seal it was handed.
 */
export class Referee {
  private history: Move[] = [];
  private rounds: Round[] = [];
  private open: SealedPrediction | null = null;

  constructor(
    private readonly oracle: Oracle,
    private readonly now: () => number,
  ) {}

  /** Produces a sealed prediction. Must be called before input is accepted. */
  seal(): SealedPrediction {
    if (this.open) return this.open;
    const { move, confidence, wasRandom, perPredictor } = this.oracle.commit(this.history);
    this.open = Object.freeze({
      commit: move,
      confidence,
      wasRandom,
      perPredictor: Object.freeze(perPredictor.map((p) => Object.freeze({ ...p }))),
      index: this.rounds.length,
      historyLength: this.history.length,
      sealedAt: this.now(),
    });
    return this.open;
  }

  /** Accepts the player's move against an existing seal. Throws if there is none. */
  resolve(seal: SealedPrediction, actual: Move): Round {
    if (!this.open) {
      throw new SealError('No sealed prediction: a press cannot be resolved before a commit.');
    }
    if (seal !== this.open) {
      throw new SealError('Stale seal: this seal does not belong to the current round.');
    }

    const round: Round = {
      index: seal.index,
      prediction: seal.commit,
      actual,
      machineWon: seal.commit === actual,
      confidence: seal.confidence,
      wasRandom: seal.wasRandom,
      perPredictor: seal.perPredictor.map((p) => ({ ...p, correct: p.guess === actual })),
    };

    this.open = null;
    this.history.push(actual);
    this.rounds.push(round);
    this.oracle.learn(actual);
    return round;
  }

  /** True while a press can be accepted. The UI attaches its input handler on this. */
  get isSealed(): boolean {
    return this.open !== null;
  }

  get currentSeal(): SealedPrediction | null {
    return this.open;
  }

  getRounds(): readonly Round[] {
    return this.rounds;
  }

  getHistory(): readonly Move[] {
    return this.history;
  }

  reset(): void {
    this.history = [];
    this.rounds = [];
    this.open = null;
    this.oracle.reset();
  }
}
