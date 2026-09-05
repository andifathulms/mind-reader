import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { Reveal } from '../../ui/Reveal';
import type { PerPredictorRecord, PredictorId, Round } from '../../engine/types';
import { PREDICTOR_IDS } from '../../engine/types';
import './Ensemble.css';

export const PREDICTOR_NAMES: Record<PredictorId, string> = {
  seer: 'SEER',
  mrm: 'MRM',
  ngram: 'N-gram',
  backoff: 'Backoff',
  levelk: 'Level-k',
};

export const PREDICTOR_TINTS: Record<PredictorId, string> = {
  seer: 'var(--p-seer)',
  mrm: 'var(--p-mrm)',
  ngram: 'var(--p-ngram)',
  backoff: 'var(--p-backoff)',
  levelk: 'var(--p-levelk)',
};

/** A one-line account of what each model is actually doing. */
const PREDICTOR_NOTES: Record<PredictorId, string> = {
  seer: 'Eight situations, a saturating counter in each. Relays, 1956.',
  mrm: 'The same eight, read from your side of the table. Half the relays.',
  ngram: 'Counts what followed this exact context before.',
  backoff: 'Long context first, falling back to shorter ones when it is thin.',
  levelk: 'Assumes you are anticipating it, and steps one level further.',
};

const side = (move: 0 | 1) => (move === 0 ? 'left' : 'right');

/** Points across the session, so a long game still draws in one pass. */
const TRACE_POINTS = 180;

/**
 * Every model's weight, over the whole session.
 *
 * The weights are already recorded per round at commit time, so this is a
 * reading of what happened rather than a recomputation — recomputing it would
 * give the weights as they are now, which is a different and wrong quantity.
 * Watching the lines cross is watching the machine change its mind about who
 * it is playing.
 */
function Weather({ rounds, active }: { rounds: readonly Round[]; active: readonly PredictorId[] }) {
  const traces = useMemo(() => {
    if (rounds.length < 2) return null;
    const step = Math.max(1, Math.ceil(rounds.length / TRACE_POINTS));
    const raw = new Map<PredictorId, Array<[number, number]>>(active.map((id) => [id, []]));
    let peak = 0;

    for (let i = 0; i < rounds.length; i += step) {
      const round = rounds[i];
      if (!round) continue;
      const x = (i / Math.max(1, rounds.length - 1)) * 100;
      for (const record of round.perPredictor) {
        raw.get(record.id)?.push([x, record.weight]);
        if (record.weight > peak) peak = record.weight;
      }
    }

    // The panel is scaled to the tallest weight the session actually reached,
    // not to 1. Five models rarely put more than a third of the mixture on any
    // one of them, and a chart drawn to 1 spends four fifths of its height on
    // territory nothing ever enters.
    const top = Math.max(0.25, Math.min(1, peak * 1.12));
    const lines = [...raw]
      .filter(([, points]) => points.length > 1)
      .map(
        ([id, points]) =>
          [
            id,
            points
              .map(([x, w]) => `${x.toFixed(2)},${(100 - (w / top) * 100).toFixed(2)}`)
              .join(' '),
          ] as const,
      );

    return { lines, top, even: 1 / Math.max(1, active.length) };
  }, [rounds, active]);

  if (!traces || traces.lines.length === 0) {
    return <p className="ensemble__empty">Play a few rounds and the weights start moving here.</p>;
  }

  const evenY = 100 - (traces.even / traces.top) * 100;

  return (
    <div className="ensemble__weather">
      <span className="ensemble__weather-y eyebrow" aria-hidden="true">
        <span>{Math.round(traces.top * 100)}%</span>
        <span>0</span>
      </span>
      <div className="ensemble__weather-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {/* An even split between the models on the board: the line every trace
              starts on, and the one they are all pulled back towards. */}
          <line
            className="ensemble__even"
            x1="0"
            x2="100"
            y1={evenY}
            y2={evenY}
            vectorEffect="non-scaling-stroke"
          />
          {traces.lines.map(([id, points]) => (
            <polyline
              key={id}
              points={points}
              // Normalised, so one dash covers the whole trace whatever its
              // length and the draw-in cannot leave a line in pieces.
              pathLength={1}
              style={{ stroke: PREDICTOR_TINTS[id] }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <span className="ensemble__weather-even eyebrow" style={{ top: `${evenY}%` }}>
          an even split
        </span>
      </div>
      <span className="ensemble__weather-axis eyebrow" aria-hidden="true">
        <span>first round</span>
        <span>round {rounds.length}</span>
      </span>
    </div>
  );
}

/**
 * The chart's key.
 *
 * The tracks carry the same five swatches, but by the time the plot is on
 * screen they are most of a page above it, and a reader should not have to
 * scroll back to find out whose line is whose.
 */
function Key({ active }: { active: readonly PredictorId[] }) {
  return (
    <ul className="ensemble__key">
      {active.map((id) => (
        <li key={id} style={{ '--tint': PREDICTOR_TINTS[id] } as CSSProperties}>
          <span className="ensemble__key-line" aria-hidden="true" />
          {PREDICTOR_NAMES[id]}
        </li>
      ))}
    </ul>
  );
}

/**
 * Five competing models of the same player, each with a live weight based on
 * recent accuracy. What a user watches here is the machine changing its mind
 * about who they are: change strategy mid-session and the weights redistribute
 * over a dozen or so presses as a different model takes over.
 *
 * Each track also shows what that model would have played this round and
 * whether it was right, so a model that currently carries no weight can be
 * watched being correct before its weight climbs.
 */
export function Ensemble() {
  const store = useGameThrottled();
  const { weights } = store.weights;
  const rounds = store.rounds;
  const last = rounds[rounds.length - 1];
  const perPredictor = new Map<PredictorId, PerPredictorRecord>(
    (last?.perPredictor ?? []).map((p) => [p.id, p]),
  );
  const active = store.currentConfig.active;
  const ordered = PREDICTOR_IDS.filter((id) => active.includes(id));
  const leader = ordered.reduce(
    (best, id) => ((weights.get(id) ?? 0) > (weights.get(best) ?? 0) ? id : best),
    ordered[0] ?? 'ngram',
  );

  return (
    <Section
      id="ensemble"
      title="The ensemble"
      eyebrow="self-report"
      ground="machine"
      intro="Five models of you, running at once against the same presses. Each is weighted by how well it has been doing lately, and the mixture makes the actual move. Change how you are playing and watch the weights move."
    >
      <Reveal className="ensemble__mixture">
        <div className="ensemble__stack" aria-hidden="true">
          {ordered.map((id) => (
            <span
              key={id}
              className="ensemble__stack-part"
              style={{
                width: `${((weights.get(id) ?? 0) * 100).toFixed(2)}%`,
                background: PREDICTOR_TINTS[id],
              }}
            />
          ))}
        </div>
        <p className="ensemble__mixture-note eyebrow">
          the mixture, right now
          {rounds.length ? ` · leading: ${PREDICTOR_NAMES[leader]}` : ''}
        </p>
      </Reveal>

      <Reveal className="ensemble" delay={1}>
        {ordered.map((id, i) => {
          const weight = weights.get(id) ?? 0;
          const record = perPredictor.get(id);
          return (
            <div
              className={`ensemble__track${id === leader && rounds.length ? ' ensemble__track--leading' : ''}`}
              key={id}
              style={
                {
                  '--tint': PREDICTOR_TINTS[id],
                  '--weight': `${(weight * 100).toFixed(2)}%`,
                  '--in': `${i * 45}ms`,
                } as CSSProperties
              }
            >
              <span className="ensemble__name">
                <span className="ensemble__swatch" aria-hidden="true" />
                {PREDICTOR_NAMES[id]}
              </span>
              <span className="ensemble__weight numeral">{(weight * 100).toFixed(0)}%</span>
              <span className="ensemble__bar" aria-hidden="true">
                <span className="ensemble__fill" />
              </span>
              <span className="ensemble__guess">
                {record ? (
                  <>
                    <span
                      className={`ensemble__verdict ensemble__verdict--${
                        record.correct ? 'right' : 'wrong'
                      }`}
                      aria-hidden="true"
                    />
                    said {side(record.guess)}, {record.correct ? 'correct' : 'missed'}
                  </>
                ) : (
                  'no round yet'
                )}
              </span>
              <span className="ensemble__note">{PREDICTOR_NOTES[id]}</span>
            </div>
          );
        })}
      </Reveal>

      <Reveal delay={2}>
        <h3 className="ensemble__heading">Weights, over the session</h3>
        <Key active={ordered} />
        <Weather rounds={rounds} active={ordered} />
        {/*
          A flat stretch in one colour is five lines, not one. Models that agree
          and are right together are rewarded identically, so their weights stay
          exactly even and the traces lie on top of each other — which looks like
          one model doing everything when in fact nothing is happening. Said
          here rather than fixed in the drawing, because nudging the lines apart
          to make the overlap visible would be drawing weights that were never
          held.
        */}
        <p className="ensemble__legend">
          Where the models agree and are right together they are rewarded
          identically, so their weights stay even and their traces lie exactly on
          top of one another. A flat run in a single colour is all five, not one.
        </p>
      </Reveal>

      <table className="visually-hidden">
        <caption>Predictor weights and last guesses</caption>
        <thead>
          <tr>
            <th scope="col">Predictor</th>
            <th scope="col">Weight</th>
            <th scope="col">Last guess</th>
            <th scope="col">Correct</th>
          </tr>
        </thead>
        <tbody>
          {active.map((id) => {
            const record = perPredictor.get(id);
            return (
              <tr key={id}>
                <th scope="row">{PREDICTOR_NAMES[id]}</th>
                <td>{((weights.get(id) ?? 0) * 100).toFixed(0)}%</td>
                <td>{record ? side(record.guess) : '—'}</td>
                <td>{record ? (record.correct ? 'yes' : 'no') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}
