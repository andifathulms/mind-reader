import type { Session } from '../engine/types';

/**
 * Export is explicit: nothing leaves the device unless the player asks for it
 * (PRD §7.5). Both formats carry the seed and the config, so an exported
 * session replays exactly.
 */
export function sessionToJson(session: Session): string {
  return JSON.stringify(
    {
      app: 'mind-reader',
      version: 1,
      seed: session.seed,
      config: session.config,
      rounds: session.rounds,
    },
    null,
    2,
  );
}

export function sessionToCsv(session: Session): string {
  const models = session.config.active;
  const header = [
    'round',
    'prediction',
    'actual',
    'machine_won',
    'confidence',
    'was_random',
    ...models.flatMap((id) => [`${id}_guess`, `${id}_weight`, `${id}_correct`]),
  ];

  const rows = session.rounds.map((round) => {
    const byId = new Map(round.perPredictor.map((p) => [p.id, p]));
    return [
      round.index + 1,
      round.prediction,
      round.actual,
      round.machineWon ? 1 : 0,
      round.confidence.toFixed(4),
      round.wasRandom ? 1 : 0,
      ...models.flatMap((id) => {
        const p = byId.get(id);
        return p ? [p.guess, p.weight.toFixed(4), p.correct ? 1 : 0] : ['', '', ''];
      }),
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

/** Just the presses, for a compressor to read from the other direction. */
export function sequenceToText(session: Session): string {
  return session.rounds.map((r) => r.actual).join('');
}
