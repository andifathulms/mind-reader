import type { Move } from '../engine/types';
import type { Rng } from '../engine/rng';

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
   * The scripted opponent. Given its own history and a seeded PRNG, it produces
   * the next press. Scripted rather than remembered, so the lab reports what the
   * strategy does rather than what a person managed to do while running it.
   */
  play(history: readonly Move[], rng: Rng): Move;
}

/** Digits of pi, mod 2. Enough of them that no session runs off the end. */
const PI_DIGITS =
  '31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679' +
  '82148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964' +
  '42881097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372' +
  '45870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/**
 * A passage to read letters from. Any text does; this one is the opening of
 * Poe's "The Purloined Letter", whose narrator plays exactly this game and
 * whose method the 1950s papers keep circling back to.
 */
const PASSAGE =
  'at paris just after dark one gusty evening in the autumn of eighteen i was enjoying the twofold luxury ' +
  'of meditation and a meerschaum in company with my friend c auguste dupin in his little back library or ' +
  'book closet au troisieme no thirty three rue dunot faubourg saint germain for one hour at least we had ' +
  'maintained a profound silence while each to any casual observer might have seemed intently and exclusively ' +
  'occupied with the curling eddies of smoke that oppressed the atmosphere of the chamber';

const letters = PASSAGE.replace(/[^a-z]/g, '');

export const STRATEGIES: readonly Strategy[] = [
  {
    id: 'alternate',
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
    name: 'Digits of pi, mod 2',
    instruction: 'Left for an even digit, right for an odd one.',
    verdict:
      'Also holds at 50%. Pi’s digits behave like a coin and the machine gets nothing. The limit is recall: most people manage about thirty digits before they start reconstructing, and reconstructing is a pattern.',
    play: (history) => {
      const digit = PI_DIGITS[history.length % PI_DIGITS.length] ?? '0';
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
