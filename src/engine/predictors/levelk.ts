import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';
import { abstain } from './predictor';

/**
 * Level-k, from the cognitive hierarchy literature.
 *
 * This is the model that catches a player who is deliberately second-guessing,
 * which is what most people do the moment they realise they are losing. The
 * other four models describe a player as a source of patterns. This one
 * describes a player as someone reasoning about the machine — and once the
 * player starts inverting their instinct, that is the more accurate account.
 *
 * The hierarchy:
 *
 *   level 0  the player has a standing habit — repeat, or alternate
 *   level 1  the player expects the machine to play their habit, so they invert
 *   level 2  the player expects the machine to expect that, so they invert back
 *   level 3  one more turn of the same screw
 *
 * Each depth is a complete prediction of the player's next move. The predictor
 * scores all four against what the player has actually done, with exponential
 * decay, and plays the depth that is currently winning. A player who climbs the
 * ladder mid-session drags the predictor up behind them, one level at a time,
 * which is what makes deliberate second-guessing a losing move: the reasoning
 * that would beat a level-1 machine is exactly what a level-2 machine expects.
 */

const DEPTHS = [0, 1, 2, 3] as const;
const DECAY = 0.92;

/** The player's base habit at level 0: are they repeating or alternating? */
interface Habit {
  repeats: number;
  switches: number;
}

export function createLevelK(): Predictor {
  let history: Move[] = [];
  let habit: Habit = { repeats: 1, switches: 1 };
  /** Decayed hit counts, one per depth. */
  let scores = new Float64Array(DEPTHS.length).fill(1);

  /**
   * The prediction at each depth. Level 0 is the habit; every level above it is
   * the level below inverted, because the player at level k believes the
   * machine is playing level k-1.
   */
  const ladder = (h: readonly Move[]): Move[] | null => {
    const last = h[h.length - 1];
    if (last === undefined) return null;
    const alternating = habit.switches > habit.repeats;
    const level0: Move = alternating ? ((1 - last) as Move) : last;
    return DEPTHS.map((k) => ((k % 2 === 0 ? level0 : 1 - level0) as Move));
  };

  const best = (): number => {
    let index = 0;
    for (let k = 1; k < scores.length; k += 1) {
      if ((scores[k] ?? 0) > (scores[index] ?? 0)) index = k;
    }
    return index;
  };

  return {
    id: 'levelk',
    name: 'Level-k',
    citation: null,

    reset() {
      history = [];
      habit = { repeats: 1, switches: 1 };
      scores = new Float64Array(DEPTHS.length).fill(1);
    },

    predict(h: readonly Move[]): Guess {
      const rungs = ladder(h);
      if (!rungs) return abstain();

      const depth = best();
      const guess = rungs[depth];
      if (guess === undefined) return abstain();

      // Confidence is how far the leading depth is ahead of the field. Where
      // two levels are doing equally well the player is not on a rung at all,
      // and the model should say so rather than pick one.
      let total = 0;
      for (const s of scores) total += s;
      const share = total > 0 ? (scores[depth] ?? 0) / total : 0.25;
      const lead = Math.max(0, (share - 0.25) / 0.75);
      // Level 0 is a habit, not a hierarchy. Say less about it: the n-gram and
      // backoff models describe habits better and should carry that weight.
      return { guess, confidence: depth === 0 ? lead * 0.6 : lead };
    },

    observe(actual: Move) {
      const rungs = ladder(history);
      if (rungs) {
        for (let k = 0; k < scores.length; k += 1) {
          scores[k] = (scores[k] ?? 0) * DECAY + (rungs[k] === actual ? 1 : 0);
        }
      }
      const last = history[history.length - 1];
      if (last !== undefined) {
        habit.repeats *= DECAY;
        habit.switches *= DECAY;
        if (actual === last) habit.repeats += 1;
        else habit.switches += 1;
      }
      history.push(actual);
    },
  };
}
