import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGame } from '../../state/context';
import type { Move, Round } from '../../engine/types';
import { formatRate } from '../../stats/interval';
import './Arena.css';

const MARKS_SHOWN = 72;

/**
 * The boundary's position, as a fraction from the top of the arena.
 *
 * Not the raw win rate. After one round the raw rate is 0 or 1, and a boundary
 * that slams to an edge on the first press would be claiming a result the
 * sample cannot support (PRD §7.4) — the opposite of what this readout is for.
 * The estimate is shrunk towards centre by a prior worth a few rounds, so the
 * boundary drifts and jitters near the middle early, exactly as a noisy 50%
 * process looks, and commits only once there is something to commit to.
 */
const PRIOR = 5;

function split(machineWins: number, rounds: number): number {
  const rate = (machineWins + PRIOR) / (rounds + 2 * PRIOR);
  return 1 - rate;
}

interface MarkProps {
  round: Round;
  newest: boolean;
}

function Mark({ round, newest }: MarkProps) {
  const kind = round.wasRandom ? 'random' : round.machineWon ? 'hit' : 'miss';
  return (
    <span
      className={`arena__mark arena__mark--${kind}${newest ? ' arena__mark--newest' : ''}`}
      aria-hidden="true"
    />
  );
}

/**
 * A tap target. Pointer-down rather than click, because the loop has to feel
 * immediate (PRD §8.5) and click waits for the release. A keyboard activation
 * arrives as a click with no detail, and is the only click that fires a press —
 * otherwise a mouse would press twice.
 */
function Target({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      className="arena__target"
      type="button"
      onPointerDown={onPress}
      onClick={(event) => {
        if (event.detail === 0) onPress();
      }}
    >
      {label}
    </button>
  );
}

export function Arena() {
  const store = useGame();
  const rounds = store.rounds;
  const reveal = store.reveal;

  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const machineWins = useMemo(() => rounds.reduce((n, r) => n + (r.machineWon ? 1 : 0), 0), [rounds]);
  const yourWins = rounds.length - machineWins;

  const press = useCallback(
    (move: Move) => {
      if (!store.press(move)) return;
      setOpen(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      // The seal for the next round already exists; this only closes the lid.
      closeTimer.current = setTimeout(() => setOpen(false), 520);
    },
    [store],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Space and Enter belong to whatever has focus; the arrows are global.
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT')) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        press(0);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        press(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const visible = rounds.slice(Math.max(0, rounds.length - MARKS_SHOWN));
  const committed = open && reveal ? reveal.round.prediction : null;

  return (
    <section
      className="arena"
      style={{ '--split': `${(split(machineWins, rounds.length) * 100).toFixed(3)}%` } as CSSProperties}
      aria-label="Arena"
    >
      <div className="arena__machine-ground" aria-hidden="true" />
      <div className="arena__boundary" aria-hidden="true" />

      <h1 className="arena__title">Mind reader (?)</h1>

      <div className="arena__side arena__side--yours">
        <span className="arena__label">you</span>
        <span className="arena__score">{yourWins}</span>
      </div>

      <div className="arena__marks" aria-hidden="true">
        {visible.map((round) => (
          <Mark key={round.index} round={round} newest={round.index === rounds.length - 1} />
        ))}
      </div>

      <div className={`arena__seal${open ? ' arena__seal--open' : ''}`}>
        <span className="arena__seal-move">{committed === null ? '' : committed === 0 ? 'left' : 'right'}</span>
        <span className="arena__seal-half arena__seal-half--left" />
        <span className="arena__seal-half arena__seal-half--right" />
      </div>

      <div className="arena__side arena__side--machine">
        <span className="arena__rate">{formatRate(machineWins, rounds.length)}</span>
        <span className="arena__label">machine</span>
        <span className="arena__score">{machineWins}</span>
      </div>

      <p className="arena__hint">left and right, or the arrow keys</p>

      <div className="arena__targets">
        <Target label="left" onPress={() => press(0)} />
        <Target label="right" onPress={() => press(1)} />
      </div>

      {/* The machine reports. It does not comment. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {reveal
          ? `Round ${reveal.round.index + 1}. You pressed ${reveal.round.actual === 0 ? 'left' : 'right'}. The machine had sealed ${reveal.round.prediction === 0 ? 'left' : 'right'}${reveal.round.wasRandom ? ', played at random' : ''}. Machine ${machineWins}, you ${yourWins}.`
          : 'A prediction is sealed. Press left or right.'}
      </p>
    </section>
  );
}
