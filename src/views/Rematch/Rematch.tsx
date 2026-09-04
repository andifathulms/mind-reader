import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Section } from '../../ui/Section';
import { createRng } from '../../engine/rng';
import { createSeer } from '../../engine/predictors/seer';
import { createMrm } from '../../engine/predictors/mrm';
import type { Predictor } from '../../engine/predictors/predictor';
import type { Move } from '../../engine/types';
import { formatRate } from '../../stats/interval';
import './Rematch.css';

/** Rounds per animation frame. The exchange must stay legible. */
const PER_FRAME = 6;
const PER_FRAME_SMALL = 2;
const TOTAL = 10_000;

interface Live {
  mrm: number;
  seer: number;
  played: number;
}

/** Plays between samples of the boundary, for the match's own trail. */
const SAMPLE_EVERY = 25;

/**
 * Hagelbarger's own figure: MRM about 55, SEER about 45. Drawn as a reference
 * on the field so the reconstruction can be seen settling near it, or not.
 */
const RECORDED = 0.55;

/**
 * Machine against machine, with the umpire between them.
 *
 * Both machines were built to match, so the umpire turns one of them around by
 * presenting it with the inverse of the other's moves. Neither machine is
 * modified — the pair that played in 1953 were two matchers with a box between
 * them, and that is what runs here.
 *
 * This is a live umpire rather than a replay of `umpire()`, because the point is
 * watching the boundary commit over thousands of rounds rather than being told
 * the final score. The engine's umpire and this loop share the machines and the
 * protocol; only the pacing differs.
 */
export function Rematch() {
  const [live, setLive] = useState<Live>({ mrm: 0, seer: 0, played: 0 });
  const [trail, setTrail] = useState<readonly number[]>([]);
  const samples = useRef<number[]>([]);
  const [running, setRunning] = useState(false);
  const frame = useRef<number | null>(null);
  const score = useRef<Live>({ mrm: 0, seer: 0, played: 0 });
  const game = useRef<{
    matcher: Predictor;
    mismatcher: Predictor;
    seenByMatcher: Move[];
    seenByMismatcher: Move[];
  } | null>(null);

  const reset = useCallback(() => {
    const matcher = createMrm(createRng(19530318));
    const mismatcher = createSeer(createRng(19560101));
    matcher.reset();
    mismatcher.reset();
    game.current = { matcher, mismatcher, seenByMatcher: [], seenByMismatcher: [] };
    score.current = { mrm: 0, seer: 0, played: 0 };
    samples.current = [];
    setLive(score.current);
    setTrail([]);
  }, []);

  useEffect(() => {
    reset();
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reset]);

  useEffect(() => {
    if (!running) return;

    const step = () => {
      const state = game.current;
      if (!state) return;
      const perFrame = window.innerWidth < 640 ? PER_FRAME_SMALL : PER_FRAME;

      // The exchange advances here rather than inside a state updater: the
      // updater runs twice under StrictMode, and advancing two machines twice
      // per frame would corrupt the match it is supposed to be reporting.
      let { mrm, seer, played } = score.current;
      if (played >= TOTAL) {
        setRunning(false);
        return;
      }
      const rounds = Math.min(perFrame, TOTAL - played);

      for (let i = 0; i < rounds; i += 1) {
        // Both moves are committed before either is revealed.
        const a = state.matcher.predict(state.seenByMatcher).guess;
        const b = state.mismatcher.predict(state.seenByMismatcher).guess;
        if (a === b) mrm += 1;
        else seer += 1;
        state.matcher.observe(b);
        state.seenByMatcher.push(b);
        const inverted = (1 - a) as Move;
        state.mismatcher.observe(inverted);
        state.seenByMismatcher.push(inverted);
        played += 1;
      }

      score.current = { mrm, seer, played };
      // One sample every SAMPLE_EVERY plays, so ten thousand plays leave a
      // trail of a few hundred points rather than ten thousand.
      if (samples.current.length < Math.floor(played / SAMPLE_EVERY)) {
        samples.current.push(1 - (mrm + 5) / (played + 10));
        setTrail(samples.current.slice());
      }
      setLive(score.current);
      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const played = live.played;
  const share = played === 0 ? 0.5 : live.mrm / played;
  // MRM's territory is the dark side below, so the boundary rises as it pulls
  // ahead. Same readout as the arena, same shrinkage for the same reason.
  const split = 1 - (live.mrm + 5) / (played + 10);

  return (
    <Section
      id="rematch"
      title="The rematch"
      eyebrow="1953 v 1956"
      intro="Shannon's machine against Hagelbarger's, with an umpire between them, exactly as the two were connected at Bell Laboratories. Shannon's is the simpler of the two and it won."
    >
      <div className="rematch">
        <div
          className="rematch__field"
          style={{ '--split': `${(split * 100).toFixed(3)}%` } as CSSProperties}
          role="img"
          aria-label={`MRM ${live.mrm}, SEER ${live.seer}, after ${played} plays`}
        >
          <div className="rematch__ground" />

          {/* The match's own history, on the same scale as the boundary, so the
              settling can be watched rather than inferred from a moving line. */}
          {trail.length > 1 ? (
            <svg
              className="rematch__trail"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <polyline
                vectorEffect="non-scaling-stroke"
                points={trail
                  .map((y, i) => `${((i / (trail.length - 1)) * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
                  .join(' ')}
              />
            </svg>
          ) : null}

          {/* Hagelbarger's recorded 55-45. */}
          <div className="rematch__recorded" style={{ top: `${(1 - RECORDED) * 100}%` }}>
            <span className="eyebrow">recorded, 1956</span>
          </div>

          <div className="rematch__line" />
          <div className="rematch__side rematch__side--top">
            <span className="eyebrow">SEER, 1956</span>
            <span className="rematch__score numeral">{live.seer}</span>
          </div>
          <div className="rematch__side rematch__side--bottom">
            <span className="eyebrow">MRM, 1953</span>
            <span className="rematch__score numeral">{live.mrm}</span>
          </div>
        </div>

        <div
          className="rematch__progress"
          style={{ '--done': `${((played / TOTAL) * 100).toFixed(2)}%` } as CSSProperties}
          aria-hidden="true"
        >
          <span />
        </div>

        <p className="rematch__meta">
          <span>
            {played.toLocaleString('en')} of {TOTAL.toLocaleString('en')} plays
          </span>
          <span>MRM, {formatRate(live.mrm, played)}</span>
        </p>

        <div className="rematch__controls">
          <button
            className="rematch__button"
            type="button"
            onClick={() => setRunning((r) => !r)}
            disabled={played >= TOTAL}
          >
            {running ? 'Pause' : played === 0 ? 'Start the match' : 'Continue'}
          </button>
          <button
            className="rematch__button"
            type="button"
            onClick={() => {
              setRunning(false);
              reset();
            }}
          >
            Reset
          </button>
        </div>

        <p className="rematch__quote">
          “After much discussion an umpire machine was built which connected the two machines, and
          they were allowed to play several thousand games. The agility of the small machine
          triumphed, and it beat the larger one about 55‑45.”
          <br />
          <span className="rematch__meta">Hagelbarger, 1956</span>
        </p>

        <table className="visually-hidden">
          <caption>Rematch score</caption>
          <tbody>
            <tr>
              <th scope="row">Plays</th>
              <td>{played}</td>
            </tr>
            <tr>
              <th scope="row">MRM</th>
              <td>{live.mrm}</td>
            </tr>
            <tr>
              <th scope="row">SEER</th>
              <td>{live.seer}</td>
            </tr>
            <tr>
              <th scope="row">MRM share</th>
              <td>{played ? `${Math.round(share * 100)}%` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
