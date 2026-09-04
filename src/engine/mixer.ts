import type { Rng } from './rng';
import type { Move, PerPredictorRecord, PredictorId, MixerConfig } from './types';
import type { Oracle } from './referee';
import type { Predictor } from './predictors/predictor';

export interface MixerState {
  weights: ReadonlyMap<PredictorId, number>;
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
 * Confidence: the weighted agreement of the predictors, where each vote is
 * scaled by that predictor's own confidence. Full agreement among confident
 * models gives high confidence; an even split gives none; a table of models
 * that are all guessing gives none either, which is what makes the machine fall
 * back constantly against a real random source.
 */
export function createMixer(
  predictors: readonly Predictor[],
  config: MixerConfig,
  rng: Rng,
): Oracle & { state(): MixerState } {
  let weights = new Map<PredictorId, number>();
  let rounds = 0;
  let lastGuesses: Array<{ id: PredictorId; guess: Move }> = [];

  const seed = () => {
    weights = new Map(predictors.map((p) => [p.id, 1 / predictors.length]));
    rounds = 0;
    lastGuesses = [];
  };
  seed();

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
        vote += weight * confidence * (guess === 1 ? 1 : -1);
        totalWeight += weight;
      }

      lastGuesses = perPredictor.map(({ id, guess }) => ({ id, guess }));

      const confidence = totalWeight > 0 ? Math.min(1, Math.abs(vote) / totalWeight) : 0;
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
        const w = weights.get(id) ?? 0;
        weights.set(id, w * config.decay + (guess === actual ? 1 : 0));
      }
      normalise();
      for (const p of predictors) p.observe(actual);
      rounds += 1;
    },

    reset() {
      for (const p of predictors) p.reset();
      seed();
    },

    state: () => ({ weights: new Map(weights), rounds }),
  };
}
