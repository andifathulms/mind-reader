import { useCallback, useEffect, useRef, useState } from 'react';
import { createMachine, seedFrom, DEFAULT_CONFIG } from '../engine';
import type { Machine, Move, Round, SealedPrediction } from '../engine';
import { wilson } from '../stats/interval';

/** How many marks the strip carries before the oldest scroll off the left. */
const MARKS_SHOWN = 28;

/**
 * The hero. It is the real machine: the same engine the arena runs, the same
 * referee, the same commitment protocol. Nothing here is a mockup of the
 * product and nothing is scripted, which is the only version of this worth
 * putting at the top of the page.
 *
 * The seed is fixed rather than taken from the clock. A landing demo that
 * replays identically is easier to talk about, and CLAUDE.md 4 forbids an
 * unseeded source anywhere in the app.
 */
function useMachine(): Machine {
  const held = useRef<Machine | null>(null);
  if (!held.current) held.current = createMachine(DEFAULT_CONFIG, seedFrom(0));
  return held.current;
}

function markKind(round: Round): 'hit' | 'miss' | 'random' {
  return round.wasRandom ? 'random' : round.machineWon ? 'hit' : 'miss';
}

/**
 * What the readout says depends on whether the machine is claiming anything
 * yet. Below the warm-up it is drawing from the PRNG and says so; a win rate
 * quoted over four random rounds would be a number pretending to be a result.
 */
function readout(rounds: readonly Round[]): string {
  const played = rounds.length;
  if (played === 0) return 'Sealed. Press a side.';

  const warmup = DEFAULT_CONFIG.minRounds - played;
  if (warmup > 0) {
    return `Drawing at random. ${warmup} more ${warmup === 1 ? 'round' : 'rounds'} before it predicts.`;
  }

  const judged = rounds.filter((r) => !r.wasRandom);
  if (judged.length === 0) return 'Still below its confidence floor, so still drawing at random.';

  const won = judged.filter((r) => r.machineWon).length;
  const { low, high } = wilson(won, judged.length);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return `${pct(won / judged.length)} over ${judged.length} predicted ${
    judged.length === 1 ? 'round' : 'rounds'
  } (95% CI: ${pct(low)} to ${pct(high)}).`;
}

export function Demo() {
  const machine = useMachine();
  const [rounds, setRounds] = useState<readonly Round[]>([]);
  const [seal, setSeal] = useState<SealedPrediction | null>(null);
  const [last, setLast] = useState<Round | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);

  // The seal exists before the first press can be accepted, and the next one is
  // produced the instant the current round resolves, so the machine is never
  // computing while the player is waiting (CLAUDE.md 7).
  useEffect(() => {
    setSeal(machine.referee.seal());
  }, [machine]);

  const press = useCallback(
    (move: Move) => {
      const open = machine.referee.currentSeal;
      if (!open) return;
      const round = machine.referee.resolve(open, move);
      setLast(round);
      setRounds([...machine.referee.getRounds()]);
      setSeal(machine.referee.seal());
    },
    [machine],
  );

  const restart = useCallback(() => {
    machine.referee.reset();
    setRounds([]);
    setLast(null);
    setSeal(machine.referee.seal());
  }, [machine]);

  // Scoped to the demo rather than the window. A landing page that swallowed
  // the arrow keys would take scrolling away from every keyboard reader who
  // never wanted to play.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowLeft') press(0);
      else if (event.key === 'ArrowRight') press(1);
      else return;
      event.preventDefault();
    },
    [press],
  );

  const marks = rounds.slice(-MARKS_SHOWN);
  const open = last !== null;

  return (
    <div className="demo" ref={frame} onKeyDown={onKeyDown}>
      <div className="demo__head">
        <span className="eyebrow">Round {rounds.length + 1}</span>
        {rounds.length > 0 && (
          <button className="demo__restart" type="button" onClick={restart}>
            Start over
          </button>
        )}
      </div>

      <div className="demo__seal" data-open={open || undefined}>
        <span className="demo__seal-label note">
          {open ? 'It had committed to' : 'Committed, not yet opened'}
        </span>
        <span className="demo__seal-value" aria-live="polite">
          {open ? (last.prediction === 0 ? 'left' : 'right') : '·'}
        </span>
      </div>

      <div className="demo__targets">
        <button
          className="demo__target"
          type="button"
          disabled={!seal}
          onPointerDown={() => press(0)}
          onClick={(event) => {
            if (event.detail === 0) press(0);
          }}
        >
          left
        </button>
        <button
          className="demo__target"
          type="button"
          disabled={!seal}
          onPointerDown={() => press(1)}
          onClick={(event) => {
            if (event.detail === 0) press(1);
          }}
        >
          right
        </button>
      </div>

      <ul className="demo__marks" aria-hidden="true">
        {marks.map((round) => (
          <li key={round.index} className="demo__mark" data-kind={markKind(round)} />
        ))}
      </ul>

      <p className="demo__readout">{readout(rounds)}</p>
    </div>
  );
}
