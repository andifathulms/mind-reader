import { Fragment, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Figure, Section } from '../../ui/Section';
import { Reveal } from '../../ui/Reveal';
import type { Config, PerPredictorRecord, PredictorId, Round } from '../../engine/types';
import { PREDICTOR_ERA, PREDICTOR_IDS } from '../../engine/types';
import type { PredictorEra } from '../../engine/types';
import { derive } from '../../engine/derive';
import { EDGE_DECAY, EDGE_MARGIN } from '../../engine/mixer';
import './Ensemble.css';

export const PREDICTOR_NAMES: Record<PredictorId, string> = {
  seer: 'SEER',
  mrm: 'MRM',
  ngram: 'N-gram',
  backoff: 'Backoff',
  levelk: 'Level-k',
  context: 'Context mix',
  runs: 'Run length',
  reaction: 'Reaction',
};

export const PREDICTOR_TINTS: Record<PredictorId, string> = {
  seer: 'var(--p-seer)',
  mrm: 'var(--p-mrm)',
  ngram: 'var(--p-ngram)',
  backoff: 'var(--p-backoff)',
  levelk: 'var(--p-levelk)',
  context: 'var(--p-context)',
  runs: 'var(--p-runs)',
  reaction: 'var(--p-reaction)',
};

const ERA_NAMES: Record<PredictorEra, string> = {
  '1950s': 'The relay machines, 1953 and 1956',
  classic: 'Classic models',
  modern: 'Modern models',
};

/** A one-line account of what each model is actually doing. */
const PREDICTOR_NOTES: Record<PredictorId, string> = {
  seer: 'Eight situations, a saturating counter in each. Relays, 1956.',
  mrm: 'The same eight, read from your side of the table. Half the relays.',
  ngram: 'Counts what followed this exact context before.',
  backoff: 'Long context first, falling back to shorter ones when it is thin.',
  levelk: 'Assumes you are anticipating it, and steps one level further.',
  context: 'Every context length at once, weighted by which has been right.',
  runs: 'How likely you are to switch after a run of one, two, three.',
  reaction: 'What you do after winning or losing a round.',
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
    // not to 1. Eight models rarely put more than a third of the mixture on any
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

/** Signed to three places, so a contribution that leans left reads as leaning left. */
const signed = (n: number) => `${n >= 0 ? '+' : '\u2212'}${Math.abs(n).toFixed(3)}`;
const percent = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The step between five guesses and one move.
 *
 * The tracks above show what each model played and the arena shows what the
 * machine committed to. Nothing has ever shown the arithmetic in between, which
 * is the only part of the machine a sceptical reader cannot reconstruct alone —
 * and this app is written for a reader whose first hypothesis is that it is
 * lying to them (PRD §4.3).
 *
 * Every number here was recorded at commit time and is multiplied out in the
 * open. It is a table rather than a drawing because it is a table: six columns
 * of figures that want to be read across, and read by a screen reader too
 * (PRD §8.9).
 */
function Ledger({
  round,
  next,
  config,
}: {
  round: Round;
  /** The round after this one, whose recorded weights are this one's result. */
  next: Round | null;
  config: Config;
}) {
  const d = derive(round, config);
  // The row carrying the most weight, which is the one worth deriving in full.
  const heaviest = d.contributions.reduce<(typeof d.contributions)[number] | null>(
    (best, c) => (best === null || c.weight > best.weight ? c : best),
    null,
  );

  /*
   * The weight that moved most across this round, read off the two records
   * rather than recomputed: the weights the next round recorded at commit time
   * are exactly what this round's learning produced.
   */
  const movement = (() => {
    if (!next) return null;
    const after = new Map(next.perPredictor.map((p) => [p.id, p.weight]));
    let best: { id: PredictorId; before: number; after: number; correct: boolean } | null = null;
    for (const p of round.perPredictor) {
      const to = after.get(p.id);
      if (to === undefined) continue;
      const moved = Math.abs(to - p.weight);
      if (best === null || moved > Math.abs(best.after - best.before)) {
        best = { id: p.id, before: p.weight, after: to, correct: p.correct };
      }
    }
    return best;
  })();

  const outcome = d.warmingUp
    ? `Round ${round.index + 1} of the ${d.minRounds}-round warm-up, so the machine drew a fair bit from the generator and this vote did not apply.`
    : d.belowFloor
      ? `Confidence ${d.confidence.toFixed(3)} fell short of the floor at ${d.floor.toFixed(2)}, so the machine drew a fair bit from the generator instead of playing the vote.`
      : `Confidence ${d.confidence.toFixed(3)} cleared the floor at ${d.floor.toFixed(2)}, so the machine played the vote.`;

  return (
    <div className="ledger">
      <table className="ledger__table">
        <caption className="visually-hidden">
          How the machine reached its move for round {round.index + 1}
        </caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Said</th>
            <th scope="col">Claimed</th>
            <th scope="col">Edge</th>
            <th scope="col">Weight</th>
            <th scope="col">Contributes</th>
          </tr>
        </thead>
        <tbody>
          {d.contributions.map((c) => (
            <tr key={c.id}>
              <th scope="row">
                <span
                  className="ledger__swatch"
                  style={{ background: PREDICTOR_TINTS[c.id] }}
                  aria-hidden="true"
                />
                {PREDICTOR_NAMES[c.id]}
              </th>
              <td>{side(c.guess)}</td>
              <td>{percent(c.confidence)}</td>
              <td>{percent(c.edge)}</td>
              <td>{percent(c.weight)}</td>
              <td className="ledger__signed">{signed(c.signed)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={5}>
              Vote, summed
            </th>
            <td className="ledger__signed">{signed(d.vote)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="ledger__rules">
        <p className="ledger__rule">
          A model is trusted no further than the weaker of what it claims and the edge it has
          actually shown, so each row contributes its weight times the smaller of those two,
          negative for left and positive for right.
        </p>
        {/*
          Where the edge column comes from. It was the one number in the table
          that arrived from nowhere, and it is the term that matters most: it
          is all that stands between a confident-sounding model and the
          mixture, and it is why this machine cannot beat a random opponent.
          Derived on the heaviest row, with its own counts, rather than
          described in general.
        */}
        {heaviest ? (
          <p className="ledger__rule">
            Edge is how much better than a coin a model has lately been.{' '}
            {PREDICTOR_NAMES[heaviest.id]} had {heaviest.hits.toFixed(2)} correct from{' '}
            {heaviest.tries.toFixed(2)} guesses, counted with old guesses fading at {EDGE_DECAY} a
            round. That smooths to ({heaviest.hits.toFixed(2)} + 1) / ({heaviest.tries.toFixed(2)} +
            2) = {heaviest.accuracy.toFixed(3)}. It is then pulled down by {EDGE_MARGIN} standard
            errors to {heaviest.lower.toFixed(3)}, because a short lucky run should not count as
            skill, and doubled about a half to an edge of {heaviest.edge.toFixed(3)}. A model right
            half the time lands on zero and contributes nothing however sure it sounds. That is what
            holds this machine to a draw against a sequence it cannot read.
          </p>
        ) : null}
        <p className="ledger__rule">
          Strength is {Math.abs(d.vote).toFixed(3)} over a total weight of{' '}
          {d.totalWeight.toFixed(3)}, which is {d.strength.toFixed(3)}. Confidence is a half of that
          above a half: {d.confidence.toFixed(3)}.
        </p>
        <p className="ledger__outcome">{outcome}</p>
        {/*
          What the round did to the weights. The traces below show five lines
          crossing and the section says you are watching the machine change its
          mind, but the rule that moves them was in no place a reader could
          reach, and the table above shows weights being spent rather than
          earned. The next round's recorded weights are this round's result, so
          the move can be shown rather than described.
        */}
        {movement ? (
          <p className="ledger__rule">
            Afterwards every weight was multiplied by the decay at {config.decay.toFixed(2)}, one
            added to each model that had been right, and the five renormalised.{' '}
            {PREDICTOR_NAMES[movement.id]} was {percent(movement.before)} going in and{' '}
            {percent(movement.after)} coming out, having{' '}
            {movement.correct ? 'guessed correctly' : 'missed'}. A model that was right ten presses
            ago is worth less than one that was right two presses ago, which is the whole of what
            the decay does.
          </p>
        ) : null}
        {d.drift > 1e-9 ? (
          <p className="ledger__drift">
            This reading reaches {d.confidence.toFixed(6)} and the machine recorded{' '}
            {round.confidence.toFixed(6)}. They should be the same number. Trust the recorded one
            and treat this as a bug.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Eight competing models of the same player, each with a live weight based on
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
  const { weights, explanations } = store.weights;
  const rounds = store.rounds;
  const last = rounds[rounds.length - 1];
  const perPredictor = new Map<PredictorId, PerPredictorRecord>(
    (last?.perPredictor ?? []).map((p) => [p.id, p]),
  );
  const active = store.currentConfig.active;
  const ordered = PREDICTOR_IDS.filter((id) => active.includes(id));

  /*
   * Which round the ledger reads.
   *
   * It read the last one, which meant that through the whole warm-up the only
   * worked example in the app was a round where the arithmetic was recorded
   * and then not used: the outcome line said the vote did not apply, on every
   * round a newcomer was likely to be looking at. The explanation was absent
   * exactly when someone was most likely to want it.
   *
   * So it prefers the most recent round the vote actually decided, and says
   * plainly when that is not the round just played. During the warm-up there
   * is no such round and it falls back to the latest one, with the count of
   * how many presses remain before the vote can decide anything.
   */
  const decided = (() => {
    for (let i = rounds.length - 1; i >= 0; i -= 1) {
      const round = rounds[i];
      if (round && !round.wasRandom) return round;
    }
    return null;
  })();
  const ledgerRound = decided ?? last ?? null;
  const remaining = store.currentConfig.minRounds - rounds.length;
  const ledgerNote = !ledgerRound
    ? ''
    : decided
      ? `Round ${ledgerRound.index + 1}, multiplied out.${
          last && ledgerRound.index !== last.index
            ? ` That is the most recent round the vote decided; round ${last.index + 1} was drawn from the generator.`
            : ''
        } Every number was recorded when the prediction was sealed, so this is a reading of what the machine did rather than a second opinion about it.`
      : `Round ${ledgerRound.index + 1}, multiplied out. No round has been decided by this vote yet: ${
          remaining > 0
            ? `${remaining} more ${remaining === 1 ? 'press' : 'presses'} of warm-up`
            : 'the mixture has not cleared its confidence floor'
        }, so what follows is the arithmetic as it stood rather than the arithmetic that chose a move.`;
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
      intro="Eight models of you, running at once against the same presses. Each is weighted by how well it has been doing lately, and the mixture makes the actual move. Change how you are playing and watch the weights move. Each one also shows what it is looking at right now, which is the state behind the prediction already sealed for your next press."
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
          const era = PREDICTOR_ERA[id];
          const previous = ordered[i - 1];
          // The eight come from three eras, and the list says so where one
          // ends and the next begins, so the reconstructions are never read as
          // modern models or the reverse.
          const opensEra = previous === undefined || PREDICTOR_ERA[previous] !== era;
          return (
            <Fragment key={id}>
              {opensEra ? <p className="ensemble__era eyebrow">{ERA_NAMES[era]}</p> : null}
              <div
                className={`ensemble__track${id === leader && rounds.length ? ' ensemble__track--leading' : ''}`}
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
                {/*
                The inside of the machine, in its own terms. PRD §3 turned down
                a stronger model because it "would win more and explain less",
                and the five kept instead were then shown as a name, a colour
                and a weight. This is the part that was being claimed and not
                delivered.
              */}
                {explanations.get(id) ? (
                  <span className="ensemble__inside">
                    <span className="ensemble__situation">{explanations.get(id)?.situation}</span>
                    <span className="ensemble__evidence">{explanations.get(id)?.evidence}</span>
                  </span>
                ) : null}
              </div>
            </Fragment>
          );
        })}
      </Reveal>

      {ledgerRound ? (
        <Figure
          title="The step between five guesses and one move"
          /*
           * The figure the table exists to reach. A confidence is only quoted
           * where it was the thing that decided the move: on a round the
           * machine played at random the number was recorded but not acted on,
           * and printing it beside the committed side would credit it with a
           * move it did not make.
           */
          value={
            ledgerRound.wasRandom
              ? `${side(ledgerRound.prediction)}, drawn`
              : `${side(ledgerRound.prediction)}, ${ledgerRound.confidence.toFixed(2)}`
          }
          note={ledgerNote}
          delay={2}
        >
          <Ledger
            round={ledgerRound}
            next={rounds[ledgerRound.index + 1] ?? null}
            config={store.currentConfig}
          />
        </Figure>
      ) : null}

      {/* Four blocks, four steps. The ledger took step two when it arrived and
          this one was left sharing it, so the last two landed together. */}
      <Reveal delay={3}>
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
          Where the models agree and are right together they are rewarded identically, so their
          weights stay even and their traces lie exactly on top of one another. A flat run in a
          single colour is several at once, not one.
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
