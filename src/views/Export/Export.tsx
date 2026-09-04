import { useCallback } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { sequenceToText, sessionToCsv, sessionToJson } from '../../state/export';
import './Export.css';

/**
 * Export is the only way anything leaves the device, and it happens because the
 * player asked (PRD §7.5). Both formats carry the seed and the settings, so an
 * exported session replays exactly.
 */
function download(name: string, type: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function Export() {
  const store = useGameThrottled();
  const rounds = store.rounds.length;

  const save = useCallback(
    (kind: 'json' | 'csv' | 'txt') => {
      const session = store.session();
      const stamp = `mind-reader-${session.seed >>> 0}-${session.rounds.length}`;
      if (kind === 'json') download(`${stamp}.json`, 'application/json', sessionToJson(session));
      else if (kind === 'csv') download(`${stamp}.csv`, 'text/csv', sessionToCsv(session));
      else download(`${stamp}.txt`, 'text/plain', sequenceToText(session));
    },
    [store],
  );

  const sequence = store.history.join('');

  return (
    <Section
      id="export"
      title="Export"
      intro="Nothing has left this device. If you want it somewhere else, take it yourself."
    >
      <div className="export">
        <button className="export__button" type="button" disabled={rounds === 0} onClick={() => save('json')}>
          Session as JSON
        </button>
        <button className="export__button" type="button" disabled={rounds === 0} onClick={() => save('csv')}>
          Rounds as CSV
        </button>
        <button className="export__button" type="button" disabled={rounds === 0} onClick={() => save('txt')}>
          Presses as text
        </button>
      </div>

      <p className="export__note">
        The JSON carries the seed and the settings alongside every round, so the session replays
        exactly. The CSV is one row per round with each model's guess and weight, for analysis
        elsewhere. The text file is just your presses — the thing to hand to a compressor, which
        will measure the same predictability from the other direction.
      </p>

      {rounds > 0 ? (
        <p className="export__sequence" aria-label="Your press sequence, as bits">
          {sequence}
        </p>
      ) : null}
    </Section>
  );
}
