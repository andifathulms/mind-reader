import type { Move } from '../types';
import type { Explanation, Guess, Predictor } from './predictor';
import { abstain } from './predictor';

/**
 * Reaction. What the player does after winning or losing a round.
 *
 * People playing a repeated game lean on win-stay, lose-shift: keep doing what
 * just worked, change what just failed (Nowak & Sigmund, 1993; for human play,
 * Wang, Xu & Zhou, 2014). Nothing in the press history alone can see that,
 * because whether a press won depends on what the machine played.
 *
 * So this is the one model that reads the machine's own past moves as well as
 * the player's. Those moves are public — each one was shown to the player the
 * moment it was revealed — and they are still presses, not timing or position
 * (PRD §7.3). The state is Shannon's shape turned around: did the player win
 * the round before last, did they repeat last time, did they win last time.
 */
const DECAY = 0.98;

const STATE_NAMES = ['lost', 'won'] as const;

export function createReaction(): Predictor {
  let switches = new Float64Array(8);
  let seen = new Float64Array(8);
  let history: Move[] = [];
  /** The mixer's own list, held by reference: it only ever grows, and copying it every press would be quadratic. */
  let own: readonly Move[] = [];
  let lastState: number | null = null;

  /** The situation after `h`, given the machine's moves `m` over the same rounds. */
  const stateOf = (h: readonly Move[], m: readonly Move[]): number | null => {
    const n = h.length;
    if (n < 2 || m.length < n) return null;
    const wonOld = m[n - 2] !== h[n - 2] ? 1 : 0;
    const repeated = h[n - 1] === h[n - 2] ? 1 : 0;
    const wonNew = m[n - 1] !== h[n - 1] ? 1 : 0;
    return (wonOld << 2) | (repeated << 1) | wonNew;
  };

  return {
    id: 'reaction',
    name: 'Reaction',
    citation: null,

    reset() {
      switches = new Float64Array(8);
      seen = new Float64Array(8);
      history = [];
      own = [];
      lastState = null;
    },

    predict(h: readonly Move[], machine: readonly Move[]): Guess {
      own = machine;
      const state = stateOf(h, machine);
      lastState = state;
      const last = h[h.length - 1];
      if (state === null || last === undefined) return abstain();
      const total = seen[state] ?? 0;
      const p = ((switches[state] ?? 0) + 1) / (total + 2);
      if (p === 0.5) return abstain();
      return {
        guess: (p > 0.5 ? 1 - last : last) as Move,
        confidence: Math.abs(2 * p - 1) * (total / (total + 3)),
      };
    },

    explain(): Explanation | null {
      if (lastState === null) {
        return {
          situation: 'Waiting for two rounds',
          evidence: 'It needs to see you win or lose twice before it has a situation to read.',
        };
      }
      const wonOld = STATE_NAMES[(lastState >> 2) & 1];
      const repeated = (lastState >> 1) & 1 ? 'repeated' : 'switched';
      const wonNew = STATE_NAMES[lastState & 1];
      return {
        situation: `You ${wonOld}, ${repeated}, then ${wonNew}`,
        evidence: `In this situation you have switched sides ${(switches[lastState] ?? 0).toFixed(
          1,
        )} times out of ${(seen[lastState] ?? 0).toFixed(1)}.`,
      };
    },

    observe(actual: Move) {
      const state = stateOf(history, own);
      const last = history[history.length - 1];
      if (state !== null && last !== undefined) {
        switches[state] = (switches[state] ?? 0) * DECAY + (actual !== last ? 1 : 0);
        seen[state] = (seen[state] ?? 0) * DECAY + 1;
      }
      history.push(actual);
    },
  };
}
