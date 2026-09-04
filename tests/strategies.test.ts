import { describe, expect, it } from 'vitest';
import { STRATEGIES } from '../src/strategies';
import { runStrategy } from '../src/strategies/run';
import { DEFAULT_CONFIG } from '../src/engine/types';

const rate = (id: string, seed = 31): number => {
  const strategy = STRATEGIES.find((s) => s.id === id);
  if (!strategy) throw new Error(`No strategy ${id}`);
  return runStrategy(strategy, DEFAULT_CONFIG, seed, 4000).rate;
};

/**
 * The lab's rows are claims about what each strategy does. If the numbers the
 * interface prints do not match the verdicts written beside them, the lab is
 * teaching the wrong lesson — and the coin's row is the whole thesis.
 */
describe('the strategy lab', () => {
  it('destroys strict alternation', () => {
    expect(rate('alternate')).toBeGreaterThan(0.9);
  });

  it('beats a player inverting their own instinct', () => {
    expect(rate('invert')).toBeGreaterThan(0.53);
  });

  it('is held to 50% by every sequence that comes from outside the player', () => {
    // The coin, the digits of pi and letters from a book all hold, which is the
    // lab's real finding: what separates the coin is not its mathematics but
    // that a person can keep executing it.
    for (const id of ['coin', 'pi', 'book']) {
      for (const seed of [1, 2, 3, 4, 5]) {
        expect(Math.abs(rate(id, seed) - 0.5), `${id} at seed ${seed}`).toBeLessThan(0.045);
      }
    }
  });

  it('marks exactly one control, and puts it last', () => {
    const controls = STRATEGIES.filter((s) => s.isControl);
    expect(controls).toHaveLength(1);
    expect(STRATEGIES[STRATEGIES.length - 1]?.id).toBe('coin');
  });
});
