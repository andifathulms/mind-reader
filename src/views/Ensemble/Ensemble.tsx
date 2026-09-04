import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import type { PerPredictorRecord, PredictorId } from '../../engine/types';
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

const side = (move: 0 | 1) => (move === 0 ? 'left' : 'right');

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
  const last = store.rounds[store.rounds.length - 1];
  const perPredictor = new Map<PredictorId, PerPredictorRecord>(
    (last?.perPredictor ?? []).map((p) => [p.id, p]),
  );
  const active = store.currentConfig.active;

  return (
    <Section
      id="ensemble"
      title="The ensemble"
      ground="machine"
      intro="Five models of you, running at once against the same presses. Each is weighted by how well it has been doing lately, and the mixture makes the actual move. Change how you are playing and watch the weights move."
    >
      <div className="ensemble__stack" aria-hidden="true">
        {active.map((id) => (
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

      <div className="ensemble">
        {PREDICTOR_IDS.filter((id) => active.includes(id)).map((id) => {
          const weight = weights.get(id) ?? 0;
          const record = perPredictor.get(id);
          return (
            <div
              className="ensemble__track"
              key={id}
              style={
                {
                  '--tint': PREDICTOR_TINTS[id],
                  '--weight': `${(weight * 100).toFixed(2)}%`,
                } as CSSProperties
              }
            >
              <span className="ensemble__name">
                <span className="ensemble__swatch" aria-hidden="true" />
                {PREDICTOR_NAMES[id]}
              </span>
              <span className="ensemble__weight">{(weight * 100).toFixed(0)}%</span>
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
            </div>
          );
        })}
      </div>

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
