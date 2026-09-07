import { describe, expect, it } from 'vitest';
import { STRATEGIES } from '../src/strategies';
import { traceAttempt } from '../src/strategies/run';
import type { Move } from '../src/engine/types';

const byId = (id: string) => {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) throw new Error(`no strategy ${id}`);
  return s;
};

describe('tracing an attempt', () => {
  it('refuses the strategies whose next press is not defined', () => {
    expect(traceAttempt(byId('coin'), [0, 1, 0])).toBeNull();
    expect(traceAttempt(byId('invert'), [0, 1, 0])).toBeNull();
  });

  it('finds nothing in a perfectly alternating run, from either foot', () => {
    const fromLeft: Move[] = [0, 1, 0, 1, 0, 1];
    const fromRight: Move[] = [1, 0, 1, 0, 1, 0];
    expect(traceAttempt(byId('alternate'), fromLeft)?.departures).toEqual([]);
    expect(traceAttempt(byId('alternate'), fromRight)?.departures).toEqual([]);
  });

  it('flags one slip as one slip, not as everything after it', () => {
    //                     0  1  2  3  4  5  6
    const presses: Move[] = [0, 1, 0, 0, 1, 0, 1];
    // Step 3 repeats instead of alternating. From step 4 the player is back on
    // a clean alternation, so only step 3 should be reported.
    const trace = traceAttempt(byId('alternate'), presses);
    expect(trace?.departures.map((d) => d.step)).toEqual([3]);
    expect(trace?.heldFor).toBe(3);
    expect(trace?.departures[0]?.expected).toBe(1);
    expect(trace?.departures[0]?.played).toBe(0);
  });

  it('holds nothing against an empty attempt', () => {
    const trace = traceAttempt(byId('alternate'), []);
    expect(trace).toEqual({ presses: 0, departures: [], heldFor: 0, openingGiven: false });
  });

  it('checks the opening press of an anchored rule and not of a relational one', () => {
    // Pi starts at 3, which is odd, so opening on the left is a real departure.
    expect(traceAttempt(byId('pi'), [0, 1, 0, 1])?.departures[0]?.step).toBe(0);
    // Alternation has no preferred foot, so neither opening can be wrong.
    expect(traceAttempt(byId('alternate'), [1, 0])?.openingGiven).toBe(true);
  });

  it('reads pi from the start of the attempt', () => {
    // 3 1 4 1 5 9 2 6 -> odd/even -> 1 1 0 1 1 1 0 0
    const correct: Move[] = [1, 1, 0, 1, 1, 1, 0, 0];
    expect(traceAttempt(byId('pi'), correct)?.departures).toEqual([]);
  });
});
