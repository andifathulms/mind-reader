import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGame } from '../../state/context';
import type { Move, Round } from '../../engine/types';
import { formatRate } from '../../stats/interval';
import './Arena.css';

const MARKS_SHOWN = 96;

/**
 * The boundary's position, as a fraction from the top of the arena.
 *
 * Not the raw win rate. After one round the raw rate is 0 or 1, and a boundary
 * that slammed to an edge on the first press would be claiming a result the
 * sample cannot support (PRD §7.4) — the opposite of what this readout is for.
 * The estimate is shrunk towards centre by a prior worth a few rounds, so the
 * boundary drifts and jitters near the middle early, exactly as a noisy 50%
 * process looks, and commits only once there is something to commit to.
 *
 * Clamped at the ends, where the exact position has stopped carrying
 * information — a boundary at 2% and one at 6% say the same thing, and the two
 * scores say it precisely. The clamp is what keeps the readouts on their own
 * ground rather than sliding under each other.
 */
const PRIOR = 5;
const MIN_SPLIT = 0.16;
const MAX_SPLIT = 0.78;

export function split(machineWins: number, rounds: number): number {
  const rate = (machineWins + PRIOR) / (rounds + 2 * PRIOR);
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, 1 - rate));
}

function markKind(round: Round): 'hit' | 'miss' | 'random' {
  return round.wasRandom ? 'random' : round.machineWon ? 'hit' : 'miss';
}

/**
 * A tap target. Pointer-down rather than click, because the loop has to feel
 * immediate (PRD §8.5) and click waits for the release. A keyboard activation
 * arrives as a click with no detail, and is the only click that fires a press —
 * otherwise a mouse would press twice.
 */
function Target({
  label,
  onPress,
  decorative,
}: {
  label: string;
  onPress: () => void;
  decorative: boolean;
}) {
  return (
    <button
      className="arena__target"
      type="button"
      // The machine layer's copy is paint, not a control. Leaving it focusable
      // put two buttons in the tab order that announce nothing, because they sit
      // inside an aria-hidden subtree.
      tabIndex={decorative ? -1 : 0}
      aria-hidden={decorative || undefined}
      onPointerDown={decorative ? undefined : onPress}
      onClick={(event) => {
        if (!decorative && event.detail === 0) onPress();
      }}
    >
      {label}
    </button>
  );
}

interface FaceProps {
  yourWins: number;
  machineWins: number;
  rounds: readonly Round[];
  open: boolean;
  committed: Move | null;
  onPress: (move: Move) => void;
  /** True for the machine layer's copy, which is paint rather than interface. */
  decorative: boolean;
}

/**
 * Everything in the arena except the grounds themselves.
 *
 * Rendered twice — once in the player's ink and once in the machine's, the
 * second clipped to the machine's territory. Wherever the dark has taken the
 * screen you see the machine's copy; everywhere else the player's. That is what
 * lets a readout sit still while the boundary moves through it, which a single
 * layer cannot do: text pinned above the tap targets would otherwise be the
 * wrong colour on its own ground half the time.
 */
function Face({ yourWins, machineWins, rounds, open, committed, onPress, decorative }: FaceProps) {
  const visible = rounds.slice(Math.max(0, rounds.length - MARKS_SHOWN));
  const newest = rounds.length - 1;

  return (
    <>
      {/*
        The boundary belongs to each layer rather than sitting above both, so
        the seal paints over it. On top, its line struck through the move it had
        just revealed.
      */}
      <div className="arena__boundary" />

      {decorative ? (
        <p className="arena__title" aria-hidden="true">
          Mind reader (?)
        </p>
      ) : (
        <h1 className="arena__title">Mind reader (?)</h1>
      )}

      <div className="arena__side arena__side--yours">
        <span className="arena__label">you</span>
        <span className="arena__score">{yourWins}</span>
      </div>

      <div className="arena__marks">
        {visible.map((round) => (
          <span
            key={round.index}
            className={`arena__mark arena__mark--${markKind(round)}${
              round.index === newest ? ' arena__mark--newest' : ''
            }`}
          />
        ))}
      </div>

      <div className={`arena__seal${open ? ' arena__seal--open' : ''}`}>
        <span className="arena__seal-move">
          {committed === null ? '' : committed === 0 ? 'left' : 'right'}
        </span>
        <span className="arena__seal-half arena__seal-half--left" />
        <span className="arena__seal-half arena__seal-half--right" />
      </div>

      <div className="arena__side arena__side--machine">
        <span className="arena__label">machine</span>
        <span className="arena__score">{machineWins}</span>
        <span className="arena__rate">{formatRate(machineWins, rounds.length)}</span>
      </div>

      <div className="arena__targets">
        <Target label="left" decorative={decorative} onPress={() => onPress(0)} />
        <Target label="right" decorative={decorative} onPress={() => onPress(1)} />
      </div>
    </>
  );
}

export function Arena() {
  const store = useGame();
  const rounds = store.rounds;
  const reveal = store.reveal;

  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The referee appends to one array, so its identity never changes. Keying the
  // count off the store's version is what makes this recompute at all.
  const machineWins = useMemo(
    () => rounds.reduce((n, r) => n + (r.machineWon ? 1 : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rounds, store.version],
  );
  const yourWins = rounds.length - machineWins;

  const press = useCallback(
    (move: Move) => {
      if (!store.press(move)) return;
      setOpen(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      // The seal for the next round already exists; this only closes the lid.
      closeTimer.current = setTimeout(() => setOpen(false), 480);
    },
    [store],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      press(event.key === 'ArrowLeft' ? 0 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const face = {
    yourWins,
    machineWins,
    rounds,
    open,
    committed: open && reveal ? reveal.round.prediction : null,
    onPress: press,
  };

  return (
    <section
      className="arena"
      id="arena"
      style={
        { '--split': `${(split(machineWins, rounds.length) * 100).toFixed(3)}%` } as CSSProperties
      }
      aria-label="Arena"
    >
      <div className="arena__layer arena__layer--yours">
        <Face {...face} decorative={false} />
      </div>
      <div className="arena__layer arena__layer--machine" aria-hidden="true">
        <Face {...face} decorative />
      </div>

      {/* The machine reports. It does not comment. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {reveal
          ? `Round ${reveal.round.index + 1}. You pressed ${
              reveal.round.actual === 0 ? 'left' : 'right'
            }. The machine had sealed ${reveal.round.prediction === 0 ? 'left' : 'right'}${
              reveal.round.wasRandom ? ', played at random' : ''
            }. Machine ${machineWins}, you ${yourWins}.`
          : 'A prediction is sealed. Press left or right.'}
      </p>
    </section>
  );
}
