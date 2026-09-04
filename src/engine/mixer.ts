import type { Rng } from './rng';
import type { Move, PerPredictorRecord, PredictorId, MixerConfig } from './types';
import type { Oracle } from './referee';
import type { Predictor } from './predictors/predictor';

export interface MixerState {
  weights: ReadonlyMap<PredictorId, number>;
  /** How much better than a coin each predictor has recently been, 0 to 1. */
  edges: ReadonlyMap<PredictorId, number>;
  rounds: number;
}

/**
 * The mixer combines the predictors and is the only thing that sees all of
 * them. A predictor that could read another's output would be a different
 * algorithm than the one it is named after (CLAUDE.md §3), so nothing is passed
 * back down.
 *
 * Weighting: each weight multiplies by `decay` and increments on a correct
 * guess, then the set is normalised. A predictor that was right ten presses ago
 * matters less than one that was right two presses ago.
 *
 * Confidence: the weighted agreement of the predictors. Each vote is scaled by
 * the smaller of two things — what that model claims about this particular
 * guess, and the edge it has actually demonstrated over the recent past. A
 * model is trusted no further than the weaker of the two, which is what keeps
 * the number honest. A predictor that has been right half the time contributes
 * nothing to the mixture's confidence however sure it sounds, so against a real
 * random source the confidence never sustains and the machine falls back to the
 * PRNG constantly. Full agreement among models that are demonstrably right
 * gives high confidence; an even split gives none.
 *
 * The mixture reports confidence as a probability — 0.5 is no information, 1.0
 * is certainty — so `confidenceFloor` reads as "how sure the machine must be
 * before it will claim a guess", which is the only reading of that control that
 * a user could act on. It also means the figure the interface prints is a
 * number the machine can be held to (PRD §7.4).
 */
export function createMixer(
  predictors: readonly Predictor[],
  config: MixerConfig,
  rng: Rng,
): Oracle & { state(): MixerState } {
  let weights = new Map<PredictorId, number>();
  /** Decayed hit counts per predictor, for the demonstrated edge. */
  let hits = new Map<PredictorId, number>();
  let tries = new Map<PredictorId, number>();
  let rounds = 0;
  let lastGuesses: Array<{ id: PredictorId; guess: Move }> = [];

  const seed = () => {
    weights = new Map(predictors.map((p) => [p.id, 1 / predictors.length]));
    hits = new Map(predictors.map((p) => [p.id, 0]));
    tries = new Map(predictors.map((p) => [p.id, 0]));
    rounds = 0;
    lastGuesses = [];
  };
  seed();

  /**
   * How much better than a coin this predictor has recently been, 0 to 1.
   * Laplace-smoothed, so a model with a short record is pulled back towards
   * having no edge rather than towards whatever its first few guesses did.
   */
  const edgeOf = (id: PredictorId): number => {
    const hit = hits.get(id) ?? 0;
    const total = tries.get(id) ?? 0;
    const accuracy = (hit + 1) / (total + 2);
    return Math.max(0, 2 * accuracy - 1);
  };

  const normalise = () => {
    let sum = 0;
    for (const w of weights.values()) sum += w;
    if (sum <= 0) {
      seed();
      return;
    }
    for (const [id, w] of weights) weights.set(id, w / sum);
  };

  return {
    commit(history: readonly Move[]) {
      const perPredictor: Array<Omit<PerPredictorRecord, 'correct'>> = [];
      let vote = 0; // positive leans to 1, negative to 0
      let totalWeight = 0;

      for (const p of predictors) {
        const weight = weights.get(p.id) ?? 0;
        const { guess, confidence } = p.predict(history);
        perPredictor.push({ id: p.id, guess, confidence, weight });
        const trusted = Math.min(confidence, edgeOf(p.id));
        vote += weight * trusted * (guess === 1 ? 1 : -1);
        totalWeight += weight;
      }

      lastGuesses = perPredictor.map(({ id, guess }) => ({ id, guess }));

      const strength = totalWeight > 0 ? Math.min(1, Math.abs(vote) / totalWeight) : 0;
      const confidence = 0.5 + strength / 2;
      const believed: Move = vote === 0 ? rng.bit() : vote > 0 ? 1 : 0;

      // Warm-up and the confidence floor are the honesty mechanism (PRD §4.4,
      // §4.5). Below either, the machine has no basis and says so by playing a
      // fair bit from the seeded PRNG.
      const wasRandom = rounds < config.minRounds || confidence < config.confidenceFloor;
      const move: Move = wasRandom ? rng.bit() : believed;

      return { move, confidence, wasRandom, perPredictor };
    },

    learn(actual: Move) {
      for (const { id, guess } of lastGuesses) {
        const correct = guess === actual;
        const w = weights.get(id) ?? 0;
        weights.set(id, w * config.decay + (correct ? 1 : 0));
        hits.set(id, (hits.get(id) ?? 0) * config.decay + (correct ? 1 : 0));
        tries.set(id, (tries.get(id) ?? 0) * config.decay + 1);
      }
      normalise();
      for (const p of predictors) p.observe(actual);
      rounds += 1;
    },

    reset() {
      for (const p of predictors) p.reset();
      seed();
    },

    state: () => ({
      weights: new Map(weights),
      edges: new Map(predictors.map((p) => [p.id, edgeOf(p.id)])),
      rounds,
    }),
  };
}
