import type { Move } from '../engine/types';

export interface PatternResult {
  pattern: string;
  observed: number;
  expected: number;
  /** The pattern's contribution to the chi-square statistic, signed by direction. */
  contribution: number;
  overproduced: boolean;
}

export interface ChiSquare {
  order: number;
  statistic: number;
  degreesOfFreedom: number;
  /** Upper-tail probability of a statistic this large under a fair coin. */
  p: number;
  patterns: PatternResult[];
}

/**
 * Chi-square on n-gram frequencies, identifying which specific patterns a
 * player overproduces.
 *
 * Reported as a ranked list rather than a chart, because the finding is "you
 * play 01010 far more than you should", and a bar chart of thirty-two patterns
 * buries that in a hedge of near-equal bars.
 */
export function ngramChiSquare(sequence: readonly Move[], order = 4): ChiSquare {
  const total = Math.max(0, sequence.length - order + 1);
  const bins = 2 ** order;
  const counts = new Map<string, number>();

  for (let i = 0; i + order <= sequence.length; i += 1) {
    const key = sequence.slice(i, i + order).join('');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const expected = total / bins;
  const patterns: PatternResult[] = [];
  let statistic = 0;

  for (let i = 0; i < bins; i += 1) {
    const pattern = i.toString(2).padStart(order, '0');
    const observed = counts.get(pattern) ?? 0;
    const term = expected > 0 ? (observed - expected) ** 2 / expected : 0;
    statistic += term;
    patterns.push({
      pattern,
      observed,
      expected,
      contribution: term,
      overproduced: observed > expected,
    });
  }

  patterns.sort((a, b) => b.contribution - a.contribution);
  const degreesOfFreedom = bins - 1;

  return {
    order,
    statistic,
    degreesOfFreedom,
    p: chiSquareUpperTail(statistic, degreesOfFreedom),
    patterns,
  };
}

/**
 * Upper tail of the chi-square distribution, via the regularised incomplete
 * gamma function. Series expansion below the mean, continued fraction above —
 * the standard split, because each converges quickly on one side and badly on
 * the other.
 */
export function chiSquareUpperTail(x: number, k: number): number {
  if (x <= 0) return 1;
  if (k <= 0) return 0;
  const a = k / 2;
  const z = x / 2;
  return z < a + 1 ? 1 - lowerSeries(a, z) : upperFraction(a, z);
}

function logGamma(x: number): number {
  // Lanczos approximation, g = 7.
  const c = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const t = x - 1;
  let sum = 0.99999999999980993;
  for (let i = 0; i < c.length; i += 1) sum += (c[i] ?? 0) / (t + i + 1);
  const w = t + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (t + 0.5) * Math.log(w) - w + Math.log(sum);
}

function lowerSeries(a: number, z: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < 500; n += 1) {
    term *= z / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return sum * Math.exp(-z + a * Math.log(z) - logGamma(a));
}

function upperFraction(a: number, z: number): number {
  const tiny = 1e-300;
  let b = z + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(-z + a * Math.log(z) - logGamma(a)) * h;
}
