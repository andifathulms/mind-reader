import type { Move } from './types';
import type { Predictor } from './predictors/predictor';

export interface Exchange {
  index: number;
  /** The matcher's move, as played. */
  matcher: Move;
  /** The mismatcher's move, as played. */
  mismatcher: Move;
  /** True when the moves agreed and the matcher took the point. */
  matcherWon: boolean;
  matcherScore: number;
  mismatcherScore: number;
}

export interface Match {
  exchanges: Exchange[];
  matcherScore: number;
  mismatcherScore: number;
}

/**
 * The umpire, as Shannon and Hagelbarger built one so their two machines could
 * play each other.
 *
 * Both machines were designed to match — each predicts its opponent and plays
 * the prediction — so one of them has to be turned around. That is the umpire's
 * job, not the machine's: it presents the mismatcher with the inverse of the
 * matcher's moves, so a machine that is internally still trying to match is
 * externally playing to differ. Neither machine is modified, which is the point
 * — the pair that played in 1953 were both matchers with a box between them.
 */
export function umpire(matcher: Predictor, mismatcher: Predictor, rounds: number): Match {
  matcher.reset();
  mismatcher.reset();

  const seenByMatcher: Move[] = [];
  const seenByMismatcher: Move[] = [];
  const exchanges: Exchange[] = [];
  let matcherScore = 0;
  let mismatcherScore = 0;

  for (let index = 0; index < rounds; index += 1) {
    // Both moves are committed before either is revealed. Sealing one machine's
    // move after seeing the other's would be the same fraud the referee exists
    // to prevent.
    const a = matcher.predict(seenByMatcher).guess;
    const b = mismatcher.predict(seenByMismatcher).guess;

    const matcherWon = a === b;
    if (matcherWon) matcherScore += 1;
    else mismatcherScore += 1;

    exchanges.push({ index, matcher: a, mismatcher: b, matcherWon, matcherScore, mismatcherScore });

    matcher.observe(b);
    seenByMatcher.push(b);
    const inverted = (1 - a) as Move;
    mismatcher.observe(inverted);
    seenByMismatcher.push(inverted);
  }

  return { exchanges, matcherScore, mismatcherScore };
}
