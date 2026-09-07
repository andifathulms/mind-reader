import type { Config, Move, PredictorId, Round } from './types';

/**
 * One model's contribution to a committed move.
 *
 * Every field here was recorded at commit time. Nothing is recomputed from the
 * predictors, because a predictor's state has moved on since and asking it
 * again would answer a different question.
 */
export interface Contribution {
  id: PredictorId;
  guess: Move;
  /** What the model claimed about this guess. */
  confidence: number;
  /** How much better than a coin it had recently been. */
  edge: number;
  /** The decayed counts the edge came from, and the smoothed rate between them. */
  hits: number;
  tries: number;
  /** `(hits + 1) / (tries + 2)`. Laplace-smoothed, so a short record is pulled
      back toward having no edge rather than toward whatever its first few
      guesses happened to do. */
  accuracy: number;
  weight: number;
  /**
   * `min(confidence, edge)`. The mixer trusts a vote no further than the weaker
   * of what a model claims and what it has demonstrated, which is what stops a
   * confident-sounding model that is right half the time from carrying the
   * mixture.
   */
  trusted: number;
  /** `weight * trusted`, signed: positive leans right, negative leans left. */
  signed: number;
}

export interface Derivation {
  contributions: Contribution[];
  /** The sum of the signed contributions. */
  vote: number;
  totalWeight: number;
  /** `|vote| / totalWeight`, capped at 1. */
  strength: number;
  /** `0.5 + strength / 2`. Should equal the round's recorded confidence. */
  confidence: number;
  /**
   * What the vote pointed at, or null when the vote was exactly even — in that
   * case the mixer drew a bit and there is nothing to derive.
   */
  believed: Move | null;
  floor: number;
  minRounds: number;
  warmingUp: boolean;
  belowFloor: boolean;
  /** Recorded on the round, not inferred. */
  wasRandom: boolean;
  committed: Move;
  /**
   * The gap between the confidence this derivation reaches and the one the
   * round recorded. It is zero up to floating point. Anything else means the
   * reading and the machine disagree, which is a bug rather than a subtlety,
   * and the interface says so rather than quietly showing the prettier number.
   */
  drift: number;
}

/**
 * The arithmetic that turned five guesses into one move, read back off the
 * record.
 *
 * The app already shows what each model would have played and what the machine
 * committed to. It has never shown the step between them, which is the only
 * part a sceptical reader cannot reconstruct for themselves — and this app is
 * built for a reader whose first hypothesis is that it is lying (PRD §4.3).
 *
 * This is a reading, not a second opinion. `confidence` here is recomputed from
 * the recorded parts purely so it can be checked against the recorded whole;
 * where the two differ the interface reports the recorded value and flags the
 * drift.
 */
export function derive(round: Round, config: Config): Derivation {
  const contributions: Contribution[] = round.perPredictor.map((p) => {
    const trusted = Math.min(p.confidence, p.edge);
    return {
      id: p.id,
      guess: p.guess,
      confidence: p.confidence,
      edge: p.edge,
      hits: p.hits,
      tries: p.tries,
      accuracy: (p.hits + 1) / (p.tries + 2),
      weight: p.weight,
      trusted,
      signed: p.weight * trusted * (p.guess === 1 ? 1 : -1),
    };
  });

  const vote = contributions.reduce((sum, c) => sum + c.signed, 0);
  const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
  const strength = totalWeight > 0 ? Math.min(1, Math.abs(vote) / totalWeight) : 0;
  const confidence = 0.5 + strength / 2;

  return {
    contributions,
    vote,
    totalWeight,
    strength,
    confidence,
    believed: vote === 0 ? null : vote > 0 ? 1 : 0,
    floor: config.confidenceFloor,
    minRounds: config.minRounds,
    warmingUp: round.index < config.minRounds,
    belowFloor: round.confidence < config.confidenceFloor,
    wasRandom: round.wasRandom,
    committed: round.prediction,
    drift: Math.abs(confidence - round.confidence),
  };
}
