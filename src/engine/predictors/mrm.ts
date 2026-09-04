import type { Rng } from '../rng';
import type { Move } from '../types';
import type { Guess, Predictor } from './predictor';

/**
 * MRM — Claude Shannon's mind-reading machine, Bell Laboratories memorandum,
 * 18 March 1953. Shannon opens by crediting Hagelbarger and describing his own
 * device as a simplified version of it. It won anyway.
 *
 * MRM keeps the same eight situations as SEER, but computes the wins and the
 * changes from the *opponent's* point of view — it models the player rather
 * than its own play, which is the difference the name is pointing at.
 *
 * Per situation it holds one thing: what the opponent did the last two times
 * this situation arose, played the same or played differently. Where the
 * opponent did the same thing both times, the machine takes that as the
 * player's habit in this situation and plays to it. Where the two disagree
 * there is no habit, and the machine plays randomly.
 *
 * That is the whole machine. It drops SEER's eight reversible counters — the
 * part hardest to build out of relays — which is how it runs on about half as
 * many, and it is also why it adapts in two plays where SEER needs four.
 */

/**
 * What MRM tells the mixer about a rule it has. The machine itself plays the
 * rule outright, but two consistent observations is not certainty: Laplace's
 * rule of succession puts the next repeat at 3/4, which is a belief strength of
 * 2p-1 = 0.5. Reporting 1.0 here would let a machine that is merely following a
 * cleared register drag the whole mixture's confidence up with it.
 */
const HABIT_STRENGTH = 0.5;

export function createMrm(rng: Rng): Predictor {
  /** What the opponent did the last two times in each state; previous as MSB. */
  let changeHistory = new Uint8Array(8);
  /** The moves this machine itself played, needed to know when the opponent won. */
  let mine: Move[] = [];
  /** Whether the opponent won each play. The opponent wins by differing. */
  let oppWon: boolean[] = [];
  /** The opponent's own moves, mirrored so `observe` can read the last one. */
  let opponent: Move[] = [];
  let pending: { state: number | null; move: Move; strength: number; length: number } | null = null;

  const stateOf = (history: readonly Move[]): number | null => {
    const n = history.length;
    if (n < 2) return null;
    const winOld = oppWon[n - 2] ? 1 : 0;
    const changed = history[n - 1] !== history[n - 2] ? 1 : 0;
    const winNew = oppWon[n - 1] ? 1 : 0;
    return (winOld << 2) | (changed << 1) | winNew;
  };

  const decide = (history: readonly Move[]) => {
    const state = stateOf(history);
    const last = history[history.length - 1];
    if (state === null || last === undefined) {
      return { move: rng.bit(), state, strength: 0 };
    }

    const habit = changeHistory[state] ?? 0;
    // 0: the opponent played the same both times. 3: changed both times.
    // 1 and 2 disagree, so there is nothing to follow.
    if (habit === 0) return { move: last, state, strength: HABIT_STRENGTH };
    if (habit === 3) return { move: (1 - last) as Move, state, strength: HABIT_STRENGTH };
    return { move: rng.bit(), state, strength: 0 };
  };

  return {
    id: 'mrm',
    name: 'MRM',
    citation: {
      author: 'C. E. Shannon',
      title: 'A Mind-Reading (?) Machine',
      where:
        'Bell Laboratories memorandum, 18 March 1953; reprinted in Claude Elwood Shannon: Collected Papers, IEEE Press, 1993, pp. 688–690',
      year: 1953,
      url: null,
    },

    reset() {
      changeHistory = new Uint8Array(8);
      mine = [];
      oppWon = [];
      opponent = [];
      pending = null;
    },

    predict(history: readonly Move[]): Guess {
      if (pending && pending.length === history.length) {
        return { guess: pending.move, confidence: pending.strength };
      }
      const { move, state, strength } = decide(history);
      pending = { state, move, strength, length: history.length };
      return { guess: move, confidence: strength };
    },

    observe(actual: Move) {
      const n = mine.length;
      const move = pending?.length === n ? pending.move : rng.bit();
      const state = pending?.length === n ? pending.state : stateOf(opponent);

      if (state !== null) {
        const previous = opponent[n - 1];
        if (previous !== undefined) {
          const changed = actual !== previous ? 1 : 0;
          changeHistory[state] = (((changeHistory[state] ?? 0) << 1) | changed) & 3;
        }
      }

      opponent.push(actual);
      mine.push(move);
      // The opponent is playing for a mismatch: it wins when the moves differ.
      oppWon.push(move !== actual);
      pending = null;
    },
  };
}
