import { describe, expect, it } from 'vitest';
import { createMachine } from '../src/engine';
import { replayAgainstEach } from '../src/engine/counterfactual';
import { createRng } from '../src/engine/rng';
import { DEFAULT_CONFIG, PREDICTOR_IDS } from '../src/engine/types';
import type { Move } from '../src/engine/types';

const SEED = 8125;

function playedSession(rounds: number) {
  const machine = createMachine(DEFAULT_CONFIG, SEED);
  const rng = createRng(31);
  const history: Move[] = [];
  let machineWins = 0;

  for (let i = 0; i < rounds; i += 1) {
    const previous = history.at(-1);
    const move: Move =
      previous === undefined ? rng.bit() : rng.next() < 0.68 ? ((1 - previous) as Move) : previous;
    const round = machine.referee.resolve(machine.referee.seal(), move);
    history.push(move);
    if (round.machineWon) machineWins += 1;
  }

  return { history, machineWins };
}

describe('replaying a session against each machine alone', () => {
  it('reproduces the session it was played against, exactly', () => {
    // The ensemble row is the same config and the same seed replayed over the
    // same presses, so it must land on the score that was actually played. If
    // it does not, the replay is not a replay and every other row in the table
    // is describing a machine the app does not run.
    const { history, machineWins } = playedSession(400);
    const rows = replayAgainstEach(history, DEFAULT_CONFIG, SEED);
    const ensemble = rows.find((r) => r.id === 'ensemble');

    expect(ensemble).toBeDefined();
    expect(ensemble?.machineWins).toBe(machineWins);
    expect(ensemble?.rounds).toBe(400);
  });

  it('reports every predictor over the same rounds', () => {
    const { history } = playedSession(200);
    const rows = replayAgainstEach(history, DEFAULT_CONFIG, SEED);

    expect(rows).toHaveLength(PREDICTOR_IDS.length + 1);
    for (const row of rows) {
      expect(row.rounds).toBe(200);
      expect(row.rate).toBeGreaterThanOrEqual(0);
      expect(row.rate).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic: the same presses and seed give the same table twice', () => {
    const { history } = playedSession(150);
    expect(replayAgainstEach(history, DEFAULT_CONFIG, SEED)).toEqual(
      replayAgainstEach(history, DEFAULT_CONFIG, SEED),
    );
  });

  it('holds every machine near 50% against a sequence from a real generator', () => {
    // The counterfactual runs the same honesty mechanism as the arena, so a
    // machine that beat a PRNG here would be as broken as one that beat it
    // there (PRD §6.2).
    const rng = createRng(9090);
    const history: Move[] = Array.from({ length: 4000 }, () => rng.bit());
    for (const row of replayAgainstEach(history, DEFAULT_CONFIG, SEED)) {
      expect(row.rate).toBeGreaterThan(0.45);
      expect(row.rate).toBeLessThan(0.55);
    }
  });
});
