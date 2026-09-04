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
  const stamp = `mind-reader-${store.currentSeed >>> 0}-${rounds}`;

  const files = [
    {
      kind: 'json' as const,
      name: `${stamp}.json`,
      title: 'The session',
      note: 'The seed, the settings and every round, so the session replays exactly.',
    },
    {
      kind: 'csv' as const,
      name: `${stamp}.csv`,
      title: 'The rounds',
      note: "One row per round, with each model's guess and weight, for analysis elsewhere.",
    },
    {
      kind: 'txt' as const,
      name: `${stamp}.txt`,
      title: 'The presses',
      note: 'Your presses and nothing else — the thing to hand to a compressor, which measures the same predictability from the other direction.',
    },
  ];

  return (
    <Section
      id="export"
      title="Export"
      eyebrow="your session"
      intro="Nothing has left this device. If you want it somewhere else, take it yourself."
    >
      <div className="export">
        {files.map((file) => (
          <button
            className="export__file"
            key={file.kind}
            type="button"
            disabled={rounds === 0}
            onClick={() => save(file.kind)}
          >
            <span className="export__kind eyebrow">{file.kind}</span>
            <span className="export__title">{file.title}</span>
            <span className="export__note">{file.note}</span>
            <span className="export__name">
              {rounds === 0 ? 'nothing to export yet' : file.name}
            </span>
          </button>
        ))}
      </div>

      {rounds > 0 ? (
        <div className="export__sequence">
          <p className="export__sequence-head eyebrow">
            <span>your presses, as bits</span>
            <span>
              {rounds} {rounds === 1 ? 'press' : 'presses'}
            </span>
          </p>
          <p className="export__bits" aria-label="Your press sequence, as bits">
            {sequence}
          </p>
        </div>
      ) : null}
    </Section>
  );
}
