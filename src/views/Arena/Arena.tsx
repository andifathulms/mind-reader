import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGame } from '../../state/context';
import type { Move, Round } from '../../engine/types';
import { formatRate, wilson } from '../../stats/interval';
import './Arena.css';

const MARKS_SHOWN = 96;
/** How much of the boundary's own history the trail carries. */
const TRAIL_SHOWN = 240;

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
 * The boundary's own history, as a line arriving from the left and meeting the
 * boundary exactly where it now sits.
 *
 * It is the same quantity the boundary reports, drawn over time rather than at
 * an instant, so a player can see whether a 58% was climbed to or fallen from.
 * Nothing here is a prediction and nothing is smoothed beyond the shrinkage the
 * boundary already applies; it is the readout with its past still attached.
 */
function Trail({ points }: { points: string }) {
  if (!points) return null;
  return (
    <svg
      className="arena__trail"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * A tap target. Pointer-down rather than click, because the loop has to feel
 * immediate (PRD §8.5) and click waits for the release. A keyboard activation
 * arrives as a click with no detail, and is the only click that fires a press —
 * otherwise a mouse would press twice.
 */
function Target({
  label,
  hint,
  onPress,
  decorative,
}: {
  label: string;
  hint: string;
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
      <span className="arena__target-label">{label}</span>
      <span className="arena__target-hint" aria-hidden="true">
        {hint}
      </span>
    </button>
  );
}

interface FaceProps {
  yourWins: number;
  machineWins: number;
  rounds: readonly Round[];
  trail: string;
  streak: { side: 'machine' | 'you' | null; length: number };
  last: Round | null;
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
function Face({
  yourWins,
  machineWins,
  rounds,
  trail,
  streak,
  last,
  open,
  committed,
  onPress,
  decorative,
}: FaceProps) {
  const visible = rounds.slice(Math.max(0, rounds.length - MARKS_SHOWN));
  const newest = rounds.length - 1;
  const played = rounds.length;
  const interval = wilson(machineWins, played);

  return (
    <>
      <Trail points={trail} />

      {/*
        The boundary belongs to each layer rather than sitting above both, so
        the seal paints over it. On top, its line struck through the move it had
        just revealed.
      */}
      <div className="arena__boundary">
        <span
          className={`arena__pulse${last ? ` arena__pulse--${markKind(last)}` : ''}`}
          key={played}
        />
      </div>

      <div className="arena__head">
        {decorative ? (
          <p className="arena__title" aria-hidden="true">
            Mind reader <span className="arena__query">(?)</span>
          </p>
        ) : (
          <h1 className="arena__title">
            Mind reader <span className="arena__query">(?)</span>
          </h1>
        )}
        <p className="arena__round eyebrow">
          {played === 0 ? 'sealed, unpressed' : `round ${played}`}
          {streak.side && streak.length > 2
            ? ` · ${streak.side === 'machine' ? 'machine' : 'you'}, ${streak.length} in a row`
            : ''}
        </p>
      </div>

      <div className="arena__side arena__side--yours">
        <span className="arena__label eyebrow">you</span>
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

      <div className="arena__committed">
        <div className={`arena__seal${open ? ' arena__seal--open' : ''}`}>
          <span className="arena__seal-move">
            {committed === null ? '' : committed === 0 ? 'left' : 'right'}
          </span>
          <span className="arena__seal-half arena__seal-half--left" />
          <span className="arena__seal-half arena__seal-half--right" />
        </div>
        {/*
          The thesis of the app, stated once, where it happens. The machine's
          move exists before the press does, and the caption says so in the
          present tense while the seal is still shut.
        */}
        <p className="arena__caption eyebrow">
          {committed === null ? 'sealed before you press' : `it had sealed ${committed === 0 ? 'left' : 'right'}`}
        </p>
      </div>

      <div className="arena__side arena__side--machine">
        <span className="arena__label eyebrow">machine</span>
        <span className="arena__score">{machineWins}</span>
        <span className="arena__readout">
          <span className="arena__rate">
            {played === 0 ? 'no rounds played' : formatRate(machineWins, played)}
          </span>
          {/*
            The interval, drawn. Early on it spans almost everything, and a band
            that wide beside a confident-looking number is the whole point of
            PRD §7.4: the figure is not yet worth reading.
          */}
          {played === 0 ? null : (
          <span
            className="arena__interval"
            style={
              {
                '--low': `${(interval.low * 100).toFixed(2)}%`,
                '--high': `${(interval.high * 100).toFixed(2)}%`,
                '--point': `${(played ? (machineWins / played) * 100 : 50).toFixed(2)}%`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className="arena__interval-band" />
            <span className="arena__interval-half" />
            <span className="arena__interval-point" />
          </span>
          )}
          {last ? (
            <span className="arena__last">
              {last.wasRandom
                ? 'last round played at random'
                : `last round sealed at ${Math.round(last.confidence * 100)}% confidence`}
            </span>
          ) : null}
        </span>
      </div>

      <div className="arena__targets">
        <Target label="left" hint="←" decorative={decorative} onPress={() => onPress(0)} />
        <Target label="right" hint="→" decorative={decorative} onPress={() => onPress(1)} />
      </div>

      <p className="arena__cue eyebrow" aria-hidden="true">
        the analysis, below
      </p>
    </>
  );
}

export function Arena() {
  const store = useGame();
  const rounds = store.rounds;
  const reveal = store.reveal;

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The referee appends to one array, so its identity never changes. Keying the
  // derived figures off the store's version is what makes them recompute at all.
  const derived = useMemo(() => {
    // The trail carries one point per round plus the current position, mapped
    // straight onto the arena's own 0..100 box so the line and the boundary
    // cannot disagree about where a win rate sits.
    const total = rounds.length;
    const from = Math.max(0, total - TRAIL_SHOWN);
    const seen = total - from;
    const points: string[] = [];
    let machineWins = 0;

    rounds.forEach((round, i) => {
      if (i >= from) {
        const x = seen <= 1 ? 100 : ((i - from) / seen) * 100;
        points.push(`${x.toFixed(2)},${(split(machineWins, i) * 100).toFixed(2)}`);
      }
      if (round.machineWon) machineWins += 1;
    });

    let streakSide: 'machine' | 'you' | null = null;
    let streakLength = 0;
    const last = rounds[total - 1];
    if (last) {
      points.push(`100,${(split(machineWins, total) * 100).toFixed(2)}`);
      streakSide = last.machineWon ? 'machine' : 'you';
      for (let i = total - 1; i >= 0 && rounds[i]?.machineWon === last.machineWon; i -= 1) {
        streakLength += 1;
      }
    }

    return {
      machineWins,
      trail: points.length > 1 ? points.join(' ') : '',
      streak: { side: streakSide, length: streakLength },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, store.version]);

  const { machineWins, trail, streak } = derived;
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

  // The opening. One frame late so the browser has a first paint to animate
  // from; the targets are live throughout, because an entrance that swallowed a
  // press would be the animation costing the game something.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
    trail,
    streak,
    last: rounds[rounds.length - 1] ?? null,
    open,
    committed: open && reveal ? reveal.round.prediction : null,
    onPress: press,
  };

  return (
    <section
      className={`arena${ready ? ' arena--ready' : ''}`}
      id="arena"
      style={
        { '--split': `${(split(machineWins, rounds.length) * 100).toFixed(3)}%` } as CSSProperties
      }
      aria-label="Arena"
    >
      <div className="arena__layer arena__layer--yours">
        <Face {...face} decorative={false} />
      </div>
      <div className="arena__layer arena__layer--machine on-machine" aria-hidden="true">
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
