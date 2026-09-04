import { describe, expect, it } from 'vitest';
import { conditionalEntropy, entropyStaircase } from '../src/stats/entropy';
import { runLengths, switchRate } from '../src/stats/runs';
import { serialCorrelation } from '../src/stats/correlation';
import { chiSquareUpperTail, ngramChiSquare } from '../src/stats/chisquare';
import { wilson, formatRate } from '../src/stats/interval';
import { createRng } from '../src/engine/rng';
import type { Move } from '../src/engine/types';

const coin = (n: number, seed: number): Move[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.bit());
};

describe('conditional entropy', () => {
  it('gives 1 bit for a balanced sequence with no structure at order 0', () => {
    const sequence: Move[] = [0, 1, 0, 1, 1, 0, 1, 0];
    // Four of each: H = -(0.5 log2 0.5) * 2 = 1 exactly, before correction.
    expect(conditionalEntropy(sequence, 0).bits).toBeCloseTo(1, 6);
  });

  it('gives 0 bits for a sequence that is fully determined by its context', () => {
    // Strict alternation: knowing the last press determines the next one.
    const sequence: Move[] = Array.from({ length: 200 }, (_, i) => (i % 2) as Move);
    expect(conditionalEntropy(sequence, 1).bits).toBeLessThan(0.05);
    // And at order 0 it is still a balanced sequence, so a full bit.
    expect(conditionalEntropy(sequence, 0).bits).toBeCloseTo(1, 2);
  });

  it('matches a direct calculation on a known biased sequence', () => {
    // 0 is followed by 1 three times in four; 1 is always followed by 0.
    const unit: Move[] = [0, 1, 0, 0, 1, 0, 1, 0];
    const sequence = Array.from({ length: 60 }, (_, i) => unit[i % unit.length] as Move);

    const { bits } = conditionalEntropy(sequence, 1);

    // Independent count of the same sequence, done a different way.
    let after0 = [0, 0];
    let after1 = [0, 0];
    for (let i = 1; i < sequence.length; i += 1) {
      const target = sequence[i - 1] === 0 ? after0 : after1;
      target[sequence[i] as number] = (target[sequence[i] as number] ?? 0) + 1;
    }
    const h = ([a, b]: number[]) => {
      const total = (a ?? 0) + (b ?? 0);
      if (total === 0) return 0;
      return [a ?? 0, b ?? 0].reduce((sum, c) => (c === 0 ? sum : sum - (c / total) * Math.log2(c / total)), 0);
    };
    const n = sequence.length - 1;
    const expected =
      (((after0[0] ?? 0) + (after0[1] ?? 0)) / n) * h(after0) +
      (((after1[0] ?? 0) + (after1[1] ?? 0)) / n) * h(after1);
    const correction = 2 / (2 * n * Math.LN2);

    expect(bits).toBeCloseTo(expected + correction, 10);
  });

  it('stays near 1 bit for a real coin at every order it can resolve', () => {
    for (const point of entropyStaircase(coin(20_000, 991))) {
      if (!point.reliable) continue;
      expect(Math.abs(point.bits - 1), `order ${point.order}`).toBeLessThan(0.02);
    }
  });

  it('refuses to call a short sequence reliable at high order', () => {
    expect(conditionalEntropy(coin(40, 3), 5).reliable).toBe(false);
  });
});

describe('run lengths', () => {
  it('counts runs by hand-checkable example', () => {
    // 0 | 11 | 000 | 1  →  one run of 1, one of 2, one of 3, and the final 1
    const buckets = runLengths([0, 1, 1, 0, 0, 0, 1], 4);
    expect(buckets.map((b) => b.observed)).toEqual([2, 1, 1, 0]);
  });

  it('matches the geometric expectation for a fair coin', () => {
    const buckets = runLengths(coin(100_000, 77), 6);
    for (const bucket of buckets) {
      // Within a few percent of 2^-k of the runs observed.
      expect(Math.abs(bucket.observed - bucket.expected) / bucket.expected).toBeLessThan(0.06);
    }
  });

  it('puts every run in a bucket, including the long tail', () => {
    const sequence = coin(5000, 12);
    const buckets = runLengths(sequence, 8);
    let runs = 1;
    for (let i = 1; i < sequence.length; i += 1) if (sequence[i] !== sequence[i - 1]) runs += 1;
    expect(buckets.reduce((n, b) => n + b.observed, 0)).toBe(runs);
  });
});

describe('switch rate', () => {
  it('is 1 for strict alternation and 0 for a constant sequence', () => {
    expect(switchRate([0, 1, 0, 1, 0]).rate).toBe(1);
    expect(switchRate([1, 1, 1, 1]).rate).toBe(0);
  });

  it('sits at a half for a coin', () => {
    expect(switchRate(coin(100_000, 4)).rate).toBeCloseTo(0.5, 2);
  });
});

describe('serial correlation', () => {
  it('finds -1 at lag 1 for strict alternation', () => {
    const sequence: Move[] = Array.from({ length: 500 }, (_, i) => (i % 2) as Move);
    const lags = serialCorrelation(sequence, 3);
    expect(lags[0]?.correlation).toBeCloseTo(-1, 2);
    expect(lags[1]?.correlation).toBeCloseTo(1, 2);
    expect(lags[0]?.significant).toBe(true);
  });

  it('finds nothing significant in a coin', () => {
    const lags = serialCorrelation(coin(20_000, 55), 10);
    expect(lags.filter((l) => l.significant).length).toBeLessThanOrEqual(1);
  });
});

describe('chi-square', () => {
  it('matches hand-computed values on a small fixture', () => {
    // Eight 2-grams over four bins: 00 appears 4 times, 01 twice, 10 twice,
    // 11 never. Expected 2 each. X2 = (4-2)^2/2 + 0 + 0 + (0-2)^2/2 = 4.
    const sequence: Move[] = [0, 0, 0, 0, 0, 1, 0, 1, 0];
    const result = ngramChiSquare(sequence, 2);
    expect(result.statistic).toBeCloseTo(4, 10);
    expect(result.degreesOfFreedom).toBe(3);
    expect(result.patterns[0]?.pattern).toBe('00');
    expect(result.patterns[0]?.overproduced).toBe(true);
  });

  it('has an upper tail that matches published critical values', () => {
    // Standard 5% critical values.
    expect(chiSquareUpperTail(3.841, 1)).toBeCloseTo(0.05, 4);
    expect(chiSquareUpperTail(7.815, 3)).toBeCloseTo(0.05, 4);
    expect(chiSquareUpperTail(24.996, 15)).toBeCloseTo(0.05, 4);
    expect(chiSquareUpperTail(11.07, 5)).toBeCloseTo(0.05, 4);
    // And the 1% value for 10 degrees of freedom.
    expect(chiSquareUpperTail(23.209, 10)).toBeCloseTo(0.01, 4);
  });

  it('does not flag a coin', () => {
    expect(ngramChiSquare(coin(20_000, 8), 4).p).toBeGreaterThan(0.01);
  });

  it('flags an alternator immediately', () => {
    const sequence: Move[] = Array.from({ length: 400 }, (_, i) => (i % 2) as Move);
    expect(ngramChiSquare(sequence, 4).p).toBeLessThan(1e-10);
  });
});

describe('Wilson intervals', () => {
  it('does not claim certainty from two rounds', () => {
    const { low, high } = wilson(2, 2);
    expect(low).toBeLessThan(0.4);
    expect(high).toBeCloseTo(1, 5);
  });

  it('matches the interval worked out by hand', () => {
    // 20 successes in 25 trials at 95%. With p = 0.8, z^2 = 3.8416:
    //   denominator = 1 + 3.8416/25              = 1.153664
    //   centre      = 0.8 + 3.8416/50            = 0.876832
    //   spread      = 1.96 * sqrt(0.19842 / 25)  = 0.174615
    //   -> (0.876832 -+ 0.174615) / 1.153664     = 0.60869, 0.91140
    const { low, high } = wilson(20, 25);
    expect(low).toBeCloseTo(0.60869, 4);
    expect(high).toBeCloseTo(0.9114, 4);
  });

  it('tightens as the sample grows', () => {
    const short = wilson(30, 50);
    const long = wilson(3000, 5000);
    expect(long.high - long.low).toBeLessThan(short.high - short.low);
  });

  it('states the interval rather than implying it', () => {
    expect(formatRate(96, 140)).toBe('69% over 140 rounds (95% CI: 60%–76%)');
  });
});
