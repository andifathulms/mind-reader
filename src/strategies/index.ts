import type { Move } from '../engine/types';
import type { Rng } from '../engine/rng';
import { PASSAGE } from './passage';

export interface Strategy {
  id: string;
  name: string;
  /** What to do, in one line. */
  instruction: string;
  /** Why it fails, or in one case why it works. Shown only after it is run. */
  verdict: string;
  /** The control. Marked distinctly and sitting last. */
  isControl?: boolean;
  /**
   * True when the history alone fixes the next press, so a departure from the
   * rule is a well-defined thing rather than a disagreement with a coin. Only
   * these can be traced against what a player actually did.
   */
  deterministic?: boolean;
  /**
   * True when the rule names an absolute sequence, so its very first press is
   * already determined: pi starts at 3 whatever you do. False for a rule about
   * the relation between presses — alternation has no preferred starting foot,
   * and a player who opens on the right has not broken it. The trace uses this
   * to decide whether the opening press can be a departure at all.
   */
  anchored?: boolean;
  /**
   * The scripted opponent. Given its own history and a seeded PRNG, it produces
   * the next press. Scripted rather than remembered, so the lab reports what the
   * strategy does rather than what a person managed to do while running it.
   */
  play(history: readonly Move[], rng: Rng): Move;
}

/**
 * Digits of pi, as many as a session asks for.
 *
 * This used to be a stored string of 404 digits read modulo its length, so any
 * run longer than that replayed the same 404 presses. A sequence that repeats
 * is not pi and is not random, and a context model will rightly learn it; the
 * lab's pi row was then measuring the loop rather than the digits. They are
 * computed instead, by Machin's formula in integer arithmetic, and extended in
 * doubling blocks as a session reaches the end of what has been computed.
 */
let piCache = '';

function arctanInverse(x: bigint, unity: bigint): bigint {
  // arctan(1/x) = 1/x - 1/(3x^3) + 1/(5x^5) - ...
  const x2 = x * x;
  let power = unity / x;
  let sum = power;
  let sign = -1n;
  for (let n = 3n; power !== 0n; n += 2n) {
    power /= x2;
    sum += (sign * power) / n;
    sign = -sign;
  }
  return sum;
}

export function piDigits(count: number): string {
  if (piCache.length >= count) return piCache;
  const want = Math.max(count, piCache.length * 2, 1024);
  const guard = 12;
  const unity = 10n ** BigInt(want + guard);
  const pi = 4n * (4n * arctanInverse(5n, unity) - arctanInverse(239n, unity));
  piCache = pi.toString().slice(0, want);
  return piCache;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const letters = PASSAGE.replace(/[^a-z]/g, '');

export const STRATEGIES: readonly Strategy[] = [
  {
    id: 'alternate',
    deterministic: true,
    name: 'Alternate strictly',
    instruction: 'Left, right, left, right. Never break it.',
    verdict:
      'The machine takes this apart within a dozen presses. Strict alternation is one bit of information repeated forever.',
    play: (history) => {
      const last = history[history.length - 1];
      return last === undefined ? 0 : ((1 - last) as Move);
    },
  },
  {
    id: 'book',
    deterministic: true,
    anchored: true,
    name: 'Copy letters from a book',
    instruction: 'Read a passage. Left for a letter in the first half of the alphabet, right for the second.',
    verdict:
      'Run by a script, this holds at 50%. The halves of the alphabet are near enough balanced that English prose makes a fair sequence. What it does not survive is being run by you: reading a passage letter by letter while playing is slow, and the moment you lose your place you are generating the sequence again.',
    play: (history) => {
      const letter = letters[history.length % letters.length] ?? 'a';
      return (ALPHABET.indexOf(letter) < 13 ? 0 : 1) as Move;
    },
  },
  {
    id: 'pi',
    deterministic: true,
    anchored: true,
    name: 'Digits of pi, mod 2',
    instruction: 'Left for an even digit, right for an odd one.',
    verdict:
      'Also holds at 50%. Pi’s digits behave like a coin and the machine gets nothing. The limit is recall: most people manage about thirty digits before they start reconstructing, and reconstructing is a pattern.',
    play: (history) => {
      const digit = piDigits(history.length + 1)[history.length] ?? '0';
      return (Number(digit) % 2) as Move;
    },
  },
  {
    id: 'invert',
    name: 'Invert your instinct',
    instruction: 'Decide what you were going to press, then press the other one.',
    verdict:
      'The strategy people reach for once they notice they are losing, and the one the level-k model was built to catch. Inverting an instinct is still a function of the instinct, so it hands the machine the same information one step later.',
    play: (history, rng) => {
      // An instinct: repeat the last press with the win-stay bias people show.
      const last = history[history.length - 1];
      if (last === undefined) return rng.bit();
      const instinct: Move = rng.next() < 0.62 ? last : ((1 - last) as Move);
      return (1 - instinct) as Move;
    },
  },
  {
    id: 'coin',
    name: 'A real coin',
    instruction: 'Flip a physical coin and press what it says.',
    verdict:
      '50%, and it stays there for as long as you keep flipping. Three of these five sequences hold the machine to a draw. This is the only one you can actually keep producing, and the reason is that it is not coming from you.',
    isControl: true,
    play: (_history, rng) => rng.bit(),
  },
];
