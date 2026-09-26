import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { useGame } from '../../state/context';
import type { Move, Round } from '../../engine/types';
import { formatRate, wilson } from '../../stats/interval';
// The same two sentences the build uses for this route's description, so the
// description cannot come loose from the page (src/meta.ts).
import { ARENA_LEDE, ARENA_POINT } from '../../meta';
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
 * scores say it precisely. The stops are measured from the two scores
 * themselves (see `useStops`), so the line comes to rest short of a numeral
 * rather than running through it; these are the fallbacks before a first
 * measurement.
 */
const PRIOR = 5;
const MIN_SPLIT = 0.16;
const MAX_SPLIT = 0.78;

export interface Stops {
  min: number;
  max: number;
}

const DEFAULT_STOPS: Stops = { min: MIN_SPLIT, max: MAX_SPLIT };

export function split(machineWins: number, rounds: number, stops: Stops = DEFAULT_STOPS): number {
  const rate = (machineWins + PRIOR) / (rounds + 2 * PRIOR);
  return Math.min(stops.max, Math.max(stops.min, 1 - rate));
}

function markKind(round: Round): 'hit' | 'miss' | 'random' {
  return round.wasRandom ? 'random' : round.machineWon ? 'hit' : 'miss';
}

const sideName = (move: Move) => (move === 0 ? 'left' : 'right');

/**
 * Where the boundary is allowed to go: from just below the player's score to
 * just above the machine's. Measured, not guessed, because the head wraps to a
 * different height at every width and a constant that fits a desktop put the
 * line through a phone's score.
 *
 * Measured from the numerals, not from the blocks they sit in, so opening the
 * note under the machine's score does not move a readout that must only ever
 * move with the score.
 */
function useStops(
  arena: RefObject<HTMLElement>,
  yours: RefObject<HTMLElement>,
  machine: RefObject<HTMLElement>,
): Stops {
  const [stops, setStops] = useState<Stops>(DEFAULT_STOPS);

  useLayoutEffect(() => {
    const box = arena.current;
    const top = yours.current;
    const bottom = machine.current;
    if (!box || !top || !bottom) return;

    const measure = () => {
      const height = box.clientHeight;
      if (height <= 0) return;
      const origin = box.getBoundingClientRect().top;
      const gap = 14;
      const min = (top.getBoundingClientRect().bottom - origin + gap) / height;
      const max = (bottom.getBoundingClientRect().top - origin - gap) / height;
      // Never let the two stops cross or pin the line: a short viewport keeps
      // at least a fifth of the screen for it to move in.
      const next =
        max - min >= 0.2
          ? { min: Math.max(0.08, min), max: Math.min(0.9, max) }
          : { min: 0.5 - 0.1, max: 0.5 + 0.1 };
      setStops((prev) =>
        Math.abs(prev.min - next.min) < 0.002 && Math.abs(prev.max - next.max) < 0.002
          ? prev
          : next,
      );
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(top);
    observer.observe(bottom);
    return () => observer.disconnect();
  }, [arena, yours, machine]);

  return stops;
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
  move,
  onPress,
  decorative,
}: {
  move: Move;
  onPress: () => void;
  decorative: boolean;
}) {
  return (
    <button
      className={`arena__target arena__target--${sideName(move)}`}
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
      <span className="arena__target-label">{move === 0 ? 'Left' : 'Right'}</span>
      <kbd className="arena__target-hint" aria-hidden="true">
        {move === 0 ? '←' : '→'}
      </kbd>
    </button>
  );
}

/**
 * A score. The digits are keyed on their value, so a change remounts them and
 * the roll plays once — a discrete change, animated, which is the house rule.
 * It rolls the same way for either side: it reports that a number went up, and
 * nothing about whose.
 */
function Score({ value, anchor }: { value: number; anchor?: RefObject<HTMLSpanElement> }) {
  return (
    <span className="arena__score" ref={anchor}>
      <span className="arena__score-digits" key={value}>
        {value}
      </span>
    </span>
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
  committedRandom: boolean;
  warmup: number;
  noteOpen: boolean;
  onToggleNote: () => void;
  onPress: (move: Move) => void;
  /** True for the machine layer's copy, which is paint rather than interface. */
  decorative: boolean;
  anchors?: {
    yours: RefObject<HTMLSpanElement>;
    machine: RefObject<HTMLSpanElement>;
  };
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
  committedRandom,
  warmup,
  noteOpen,
  onToggleNote,
  onPress,
  decorative,
  anchors,
}: FaceProps) {
  const visible = rounds.slice(Math.max(0, rounds.length - MARKS_SHOWN));
  const newest = rounds.length - 1;
  const played = rounds.length;
  const interval = wilson(machineWins, played);
  // The quantity the boundary actually draws, so the note beside it can state
  // it rather than describe it.
  const shrunkRate = (machineWins + PRIOR) / (played + 2 * PRIOR);
  const warming = played < warmup;

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

      {/*
        The head and the player's score share one column in normal flow, and
        the machine's score, the keys and the cue share another anchored to
        the bottom. However the head wraps, nothing can land on anything else.
      */}
      <div className="arena__top">
        <div className="arena__head">
          <div className="arena__brand">
            {decorative ? (
              <p className="arena__title" aria-hidden="true">
                Mind reader <span className="arena__query">(?)</span>
              </p>
            ) : (
              <h1 className="arena__title">
                Mind reader <span className="arena__query">(?)</span>
              </h1>
            )}
            {/*
            The premise, where a stranger meets it. One sentence naming the game
            and the interaction, in the machine's own register. Not onboarding.
          */}
            <p className="arena__lede">{ARENA_LEDE}</p>
          </div>

          <div className="arena__meta">
            {/*
            The warm-up, stated while it lasts. It is true information — the
            machine is playing a fair coin and says so — and it tells a player
            that the first dozen rounds are not the game yet, without saying
            what the game will be.
          */}
            {warming ? (
              <span className="arena__chip arena__chip--warm">
                Warm-up · {played} of {warmup}
              </span>
            ) : null}
            <span className="arena__chip arena__round">
              {played === 0 ? 'Not yet pressed' : `Round ${played}`}
              {streak.side && streak.length > 2 ? (
                <span className="arena__streak">
                  {`· ${streak.side === 'machine' ? 'machine' : 'you'}, ${streak.length} in a row`}
                </span>
              ) : null}
            </span>
            {/*
            The way out to the explanation. The landing page answers every
            question this screen deliberately does not.
          */}
            <a
              className="arena__about"
              href={`${import.meta.env.BASE_URL}landing.html`}
              tabIndex={decorative ? -1 : undefined}
              aria-hidden={decorative || undefined}
            >
              What this is
            </a>
          </div>
        </div>

        <div className="arena__side arena__side--yours">
          <span className="arena__label eyebrow">You</span>
          <Score value={yourWins} {...(anchors ? { anchor: anchors.yours } : {})} />
        </div>
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
            {committed === null ? null : (
              <>
                <span className="arena__seal-arrow">{committed === 0 ? '←' : '→'}</span>
                <span className="arena__seal-word">{committedRandom ? 'random' : 'sealed'}</span>
              </>
            )}
          </span>
          <span className="arena__seal-half arena__seal-half--left" />
          <span className="arena__seal-half arena__seal-half--right" />
          <span className="arena__seal-lock" />
        </div>
        {/*
          The thesis of the app, stated once, where it happens. The machine's
          move exists before the press does, and the caption says so in the
          present tense while the seal is still shut.
        */}
        <p className="arena__caption">
          {committed === null ? 'Sealed before you press' : `It had sealed ${sideName(committed)}`}
        </p>
      </div>

      <div className="arena__bottom">
        <div className="arena__side arena__side--machine">
          <span className="arena__label eyebrow" ref={anchors?.machine}>
            Machine
          </span>
          <Score value={machineWins} />
          <span className="arena__readout">
            <span className="arena__rate">
              {played === 0 ? ARENA_POINT : formatRate(machineWins, played)}
            </span>
            {/*
            The interval, drawn. Early on it spans almost everything, and a band
            that wide beside a confident-looking number is the whole point of
            PRD §7.4: the figure is not yet worth reading.
          */}
            {played === 0 ? null : (
              <span className="arena__gauge">
                <span
                  className="arena__interval"
                  style={
                    {
                      '--low': `${(interval.low * 100).toFixed(2)}%`,
                      '--high': `${(interval.high * 100).toFixed(2)}%`,
                      '--point': `${((machineWins / played) * 100).toFixed(2)}%`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="arena__interval-band" />
                  <span className="arena__interval-half" />
                  <span className="arena__interval-point" />
                </span>
                {/*
                What the boundary is, one tap away. The boundary is the largest
                moving thing on the screen and it is not the win rate: it is
                that rate shrunk toward even by a prior worth PRIOR rounds, then
                stopped short of the scores. Said on request rather than beside
                the score while the player is trying to play.
              */}
                {decorative ? (
                  <span className="arena__why" aria-hidden="true">
                    Why the line is at {Math.round(shrunkRate * 100)}%
                  </span>
                ) : (
                  <button
                    className="arena__why"
                    type="button"
                    aria-expanded={noteOpen}
                    aria-controls="arena-boundary-note"
                    onClick={onToggleNote}
                  >
                    Why the line is at {Math.round(shrunkRate * 100)}%
                  </button>
                )}
              </span>
            )}
            {played > 0 && noteOpen ? (
              <span
                className="arena__boundary-note"
                {...(decorative ? {} : { id: 'arena-boundary-note' })}
              >
                The boundary is at {Math.round(shrunkRate * 100)}%, not{' '}
                {Math.round((machineWins / played) * 100)}%. It is an estimate pulled toward even by
                a prior worth {PRIOR} rounds, so a short lead cannot throw it to an edge, and it
                stops short of the two scores, where its exact position no longer says anything they
                do not.
              </span>
            ) : null}
            {last ? (
              <span className="arena__last">
                {last.wasRandom
                  ? 'Last round played at random.'
                  : `Last round sealed at ${Math.round(last.confidence * 100)}% confidence.`}
              </span>
            ) : null}
          </span>
        </div>

        <div className="arena__targets">
          <Target move={0} decorative={decorative} onPress={() => onPress(0)} />
          <Target move={1} decorative={decorative} onPress={() => onPress(1)} />
        </div>

        <p className="arena__cue" aria-hidden="true">
          The analysis, below
        </p>
      </div>
    </>
  );
}

export function Arena() {
  const store = useGame();
  const rounds = store.rounds;
  const reveal = store.reveal;
  const warmup = store.currentConfig.minRounds;

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arenaRef = useRef<HTMLElement>(null);
  const yoursRef = useRef<HTMLSpanElement>(null);
  const machineRef = useRef<HTMLSpanElement>(null);
  const stops = useStops(arenaRef, yoursRef, machineRef);

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
        points.push(`${x.toFixed(2)},${(split(machineWins, i, stops) * 100).toFixed(2)}`);
      }
      if (round.machineWon) machineWins += 1;
    });

    let streakSide: 'machine' | 'you' | null = null;
    let streakLength = 0;
    const last = rounds[total - 1];
    if (last) {
      points.push(`100,${(split(machineWins, total, stops) * 100).toFixed(2)}`);
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
  }, [rounds, store.version, stops]);

  const { machineWins, trail, streak } = derived;
  const yourWins = rounds.length - machineWins;

  const press = useCallback(
    (move: Move) => {
      if (!store.press(move)) return;
      setOpen(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      // The seal for the next round already exists; this only closes the lid.
      closeTimer.current = setTimeout(() => setOpen(false), 480);

      // The key goes down in both layers at once. Written straight to the DOM,
      // because the visible copy of the key is in the machine's layer, which
      // takes no pointer events and so never sees :active, and because a
      // re-render is the one thing the press path cannot afford twice.
      const arena = arenaRef.current;
      if (arena) {
        arena.dataset.pressed = sideName(move);
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
          delete arena.dataset.pressed;
        }, 110);
      }

      // A tick under the thumb, the same on a win as on a loss. It says a press
      // landed, and nothing about how it went.
      try {
        navigator.vibrate?.(8);
      } catch {
        // Some browsers throw rather than ignore; the press has landed either way.
      }
    },
    [store],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      // A slider in the analysis takes its own arrow keys.
      const target = event.target;
      if (target instanceof Element && target.closest('input, select, textarea, [role="tab"]')) {
        return;
      }
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
      if (pressTimer.current) clearTimeout(pressTimer.current);
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
    committedRandom: Boolean(reveal?.round.wasRandom),
    warmup,
    noteOpen,
    onToggleNote: () => setNoteOpen((v) => !v),
    onPress: press,
  };

  return (
    <section
      className={`arena${ready ? ' arena--ready' : ''}`}
      id="arena"
      ref={arenaRef}
      style={
        {
          '--split': `${(split(machineWins, rounds.length, stops) * 100).toFixed(3)}%`,
        } as CSSProperties
      }
      aria-label="Arena"
    >
      <div className="arena__layer arena__layer--yours">
        <Face {...face} decorative={false} anchors={{ yours: yoursRef, machine: machineRef }} />
      </div>
      <div className="arena__layer arena__layer--machine on-machine" aria-hidden="true">
        <Face {...face} decorative />
      </div>

      {/* The machine reports. It does not comment. */}
      <p className="visually-hidden" role="status">
        {reveal
          ? `Round ${reveal.round.index + 1}. You pressed ${sideName(
              reveal.round.actual,
            )}. The machine had sealed ${sideName(reveal.round.prediction)}${
              reveal.round.wasRandom ? ', played at random' : ''
            }. Machine ${machineWins}, you ${yourWins}.`
          : 'A prediction is sealed. Press left or right.'}
      </p>
    </section>
  );
}
