import type { Rng } from '../rng';
import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';

/**
 * SEER — D. W. Hagelbarger's SEquence Extrapolating Robot, 1956.
 *
 * Reconstructed from the paper's own description of the machine. The state of
 * play is three facts, in the order they occur in time:
 *
 *   - whether it won or lost the play before last          (W/L)
 *   - whether it played the same or differently last time  (S/D)
 *   - whether it won or lost the last play                 (W/L)
 *
 * giving eight states, WSW through LDL. Each state stores two things: whether
 * the machine should play same or different in that state in order to win, held
 * in a reversible counter running from -3 to +3; and whether it has been
 * winning in that state, held as the win/loss of the last two plays that
 * reached it. The stops at +3 and -3 "in effect make the machine forget ancient
 * history" — the saturation is the forgetting, and it is deliberate.
 *
 * Play: lost both of the last two times in this state, play randomly with equal
 * odds. Won one of the two, follow the counter at three-to-one odds. Won both,
 * follow the counter.
 *
 * Everything SEER knows about the game it derives from its own play, so inside
 * the ensemble it tracks the moves it would itself have made rather than the
 * mixture's. It is the same machine either way; the ensemble just does not
 * always act on it. See NOTES.md for what the sources do not settle.
 */

const MAX_COUNT = 3;

export function createSeer(rng: Rng): Predictor {
  /** Same or different, per state, as a counter saturating at ±3. */
  let counters = new Int8Array(8);
  /** Win/loss of the last two plays in each state, previous bit as MSB. */
  let winHistory = new Uint8Array(8);
  /** The moves this machine itself played. */
  let mine: Move[] = [];
  /** Whether this machine won each play. */
  let won: boolean[] = [];
  /** The state used for the play now pending, and the move committed to it. */
  let pending: { state: number | null; move: Move; strength: number; length: number } | null =
    null;

  /** The state of play, or null before there are two plays to build it from. */
  const stateOf = (n: number): number | null => {
    if (n < 2) return null;
    const winOld = won[n - 2] ? 1 : 0;
    const changed = mine[n - 1] !== mine[n - 2] ? 1 : 0;
    const winNew = won[n - 1] ? 1 : 0;
    return (winOld << 2) | (changed << 1) | winNew;
  };

  const decide = (n: number): { move: Move; state: number | null; strength: number } => {
    const state = stateOf(n);
    const last = mine[n - 1];
    if (state === null || last === undefined) {
      return { move: rng.bit(), state, strength: 0 };
    }

    const count = counters[state] ?? 0;
    const wins = winHistory[state] ?? 0;
    const lostBoth = wins === 0;
    const wonBoth = wins === 3;

    // No instruction in the counter, or losing in this state: equal odds.
    if (count === 0 || lostBoth) return { move: rng.bit(), state, strength: 0 };

    // The counter is a margin, not a probability. Smooth it the same way the
    // context models smooth a sparse count, so a counter that has only just
    // left zero does not speak with the authority of a saturated one.
    const margin = Math.abs(count);
    const belief = margin / (margin + 1);

    const instructed: Move = count > 0 ? last : ((1 - last) as Move);
    if (wonBoth) return { move: instructed, state, strength: belief };

    // Won one of the last two: three-to-one odds on following the instruction.
    const follow = rng.next() < 0.75;
    return {
      move: follow ? instructed : ((1 - instructed) as Move),
      state,
      // Half the confidence of a state it is winning in, because a quarter of
      // the time this move is the opposite of what the counter says.
      strength: belief * 0.5,
    };
  };

  return {
    id: 'seer',
    name: 'SEER',
    citation: {
      author: 'D. W. Hagelbarger',
      title: 'SEER, A SEquence Extrapolating Robot',
      where: 'IRE Transactions on Electronic Computers, EC-5(1), pp. 1–7',
      year: 1956,
      url: null,
    },

    reset() {
      counters = new Int8Array(8);
      winHistory = new Uint8Array(8);
      mine = [];
      won = [];
      pending = null;
    },

    predict(history: readonly Move[]): Guess {
      // Idempotent within a round: asking twice must not consume the PRNG
      // twice, or a seal could differ from the move it sealed.
      if (pending && pending.length === history.length) {
        return { guess: pending.move, confidence: pending.strength };
      }
      const { move, state, strength } = decide(history.length);
      pending = { state, move, strength, length: history.length };
      return { guess: move, confidence: strength };
    },

    observe(actual: Move) {
      const n = mine.length;
      const move = pending?.length === n ? pending.move : rng.bit();
      const state = pending?.length === n ? pending.state : stateOf(n);

      if (state !== null) {
        // "If the machine should have played same, one is added to the counter.
        // If it should have played different, one is subtracted." It should
        // have played whatever the opponent played.
        const previous = mine[n - 1];
        if (previous !== undefined) {
          const sameWouldHaveWon = actual === previous;
          const next = (counters[state] ?? 0) + (sameWouldHaveWon ? 1 : -1);
          counters[state] = Math.max(-MAX_COUNT, Math.min(MAX_COUNT, next));
        }
        winHistory[state] = (((winHistory[state] ?? 0) << 1) | (move === actual ? 1 : 0)) & 3;
      }

      mine.push(move);
      won.push(move === actual);
      pending = null;
    },
  };
}
