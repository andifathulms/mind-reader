/**
 * Seeded PRNG. `Math.random()` is banned engine-wide (CLAUDE.md §4) because a
 * session must be replayable from its seed alone.
 *
 * sfc32, seeded through splitmix32. Both are small, fast and have no state we
 * cannot serialise, which is what replay needs.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** A fair bit. */
  bit(): 0 | 1;
  /** Integer in [0, n). */
  below(n: number): number;
  /** The internal state, so a session can be resumed exactly where it stopped. */
  snapshot(): RngState;
  restore(state: RngState): void;
}

export type RngState = readonly [number, number, number, number];

function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const seeder = splitmix32(seed);
  let a = seeder();
  let b = seeder();
  let c = seeder();
  let d = seeder();

  // sfc32 starts correlated with its seed; discard the first few outputs.
  const step = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t >>> 0;
  };
  for (let i = 0; i < 12; i += 1) step();

  return {
    next: () => step() / 4294967296,
    bit: () => ((step() >>> 31) as 0 | 1),
    below: (n) => Math.floor((step() / 4294967296) * n),
    snapshot: () => [a, b, c, d] as const,
    restore: (state) => {
      [a, b, c, d] = state;
    },
  };
}

/** A seed from the clock, for a fresh session. The clock is injected (CLAUDE.md §5). */
export function seedFrom(now: number): number {
  return (now ^ 0x5f356495) >>> 0;
}
