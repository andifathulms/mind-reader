import { describe, expect, it } from 'vitest';
import { readUrl, writeUrl } from '../src/state/url';
import { sessionToCsv, sessionToJson, sequenceToText } from '../src/state/export';
import { createMachine } from '../src/engine';
import { DEFAULT_CONFIG } from '../src/engine/types';
import type { Move, Session } from '../src/engine/types';
import { createRng } from '../src/engine/rng';

function playSession(seed: number, presses: readonly Move[]): Session {
  const machine = createMachine(DEFAULT_CONFIG, seed);
  for (const press of presses) machine.referee.resolve(machine.referee.seal(), press);
  return machine.session();
}

const presses: Move[] = Array.from({ length: 120 }, (_, i) => ((i * 5) % 7 < 3 ? 1 : 0));

describe('determinism', () => {
  it('replays identically from the same seed, presses and settings', () => {
    expect(playSession(777, presses)).toEqual(playSession(777, presses));
  });

  it('produces a different session from a different seed', () => {
    expect(playSession(777, presses)).not.toEqual(playSession(778, presses));
  });

  it('replays an exported session exactly from what the export carries', () => {
    const original = playSession(4242, presses);
    const exported = JSON.parse(sessionToJson(original));
    const machine = createMachine(exported.config, exported.seed);
    const replayed = exported.rounds.map((round: { actual: Move }) =>
      machine.referee.resolve(machine.referee.seal(), round.actual),
    );
    expect(replayed).toEqual(original.rounds);
  });
});

describe('the URL', () => {
  it('round-trips the settings and the seed', () => {
    const state = {
      seed: 123456,
      config: { ...DEFAULT_CONFIG, decay: 0.87, confidenceFloor: 0.72, minRounds: 5, active: ['mrm' as const] },
    };
    expect(readUrl(writeUrl(state), 0)).toEqual(state);
  });

  it('never carries the presses', () => {
    const hash = writeUrl({ seed: 1, config: DEFAULT_CONFIG });
    expect(hash).not.toMatch(/press|history|rounds|moves/);
    // Nothing in the hash is long enough to be a hidden sequence.
    for (const [, value] of new URLSearchParams(hash.slice(1))) {
      expect(value.length).toBeLessThan(40);
    }
  });

  it('falls back to the defaults on nonsense', () => {
    const { config, seed } = readUrl('#decay=banana&floor=-9&models=ghost&warmup=1e9', 99);
    expect(seed).toBe(99);
    expect(config.decay).toBe(DEFAULT_CONFIG.decay);
    expect(config.confidenceFloor).toBe(0.5);
    expect(config.minRounds).toBe(200);
    expect(config.active).toEqual(DEFAULT_CONFIG.active);
  });
});

describe('export', () => {
  it('writes one CSV row per round plus a header', () => {
    const session = playSession(9, presses);
    const lines = sessionToCsv(session).split('\n');
    expect(lines).toHaveLength(presses.length + 1);
    expect(lines[0]).toContain('seer_guess');
    expect(lines[1]?.split(',')[0]).toBe('1');
  });

  it('writes the presses and only the presses as text', () => {
    const session = playSession(9, presses);
    expect(sequenceToText(session)).toBe(presses.join(''));
  });

  it('carries the seed and the settings in the JSON', () => {
    const parsed = JSON.parse(sessionToJson(playSession(555, presses)));
    expect(parsed.seed).toBe(555);
    expect(parsed.config).toEqual(DEFAULT_CONFIG);
  });
});

describe('the seeded PRNG', () => {
  it('is uniform enough to be a fair coin', () => {
    const rng = createRng(2024);
    let ones = 0;
    const n = 200_000;
    for (let i = 0; i < n; i += 1) ones += rng.bit();
    expect(Math.abs(ones / n - 0.5)).toBeLessThan(0.005);
  });

  it('produces the same stream from the same seed and different streams from different seeds', () => {
    const take = (seed: number) => Array.from({ length: 50 }, () => createRng(seed).next());
    expect(take(5)).toEqual(take(5));
    expect(createRng(5).next()).not.toBe(createRng(6).next());
  });
});
