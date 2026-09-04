import { useCallback, useState } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { STRATEGIES } from '../../strategies';
import { runStrategy } from '../../strategies/run';
import type { StrategyResult } from '../../strategies/run';
import { formatRate } from '../../stats/interval';
import './Lab.css';

const ROUNDS = 2000;

/** The stretch of the player's own session spent attempting one strategy. */
interface Attempt {
  from: number;
  to: number | null;
}

/**
 * The strategy lab.
 *
 * Each row is a named strategy, what the machine scores when a script runs it
 * perfectly, and what the machine scored against you over the rounds you spent
 * attempting it. The gap between those two columns is the whole app.
 *
 * Three of the five scripted rows hold the machine to 50%: the coin, the digits
 * of pi, and letters from a book. That is the honest finding and it is a
 * sharper one than "only the coin works" — what separates the coin is not its
 * mathematics but that you can keep executing it. The other two are perfectly
 * good sequences you cannot reliably produce, and this table is where a player
 * finds that out about themselves rather than being told it.
 */
export function Lab() {
  const store = useGameThrottled();
  const [results, setResults] = useState<Map<string, StrategyResult>>(new Map());
  const [attempts, setAttempts] = useState<Map<string, Attempt>>(new Map());
  const [attempting, setAttempting] = useState<string | null>(null);

  const config = store.currentConfig;
  const seed = store.currentSeed;
  const rounds = store.rounds;

  const run = useCallback(
    (id: string) => {
      const strategy = STRATEGIES.find((s) => s.id === id);
      if (!strategy) return;
      const result = runStrategy(strategy, config, seed + strategy.id.length, ROUNDS);
      setResults((previous) => new Map(previous).set(id, result));
    },
    [config, seed],
  );

  const runAll = useCallback(() => {
    const next = new Map<string, StrategyResult>();
    for (const strategy of STRATEGIES) {
      next.set(strategy.id, runStrategy(strategy, config, seed + strategy.id.length, ROUNDS));
    }
    setResults(next);
  }, [config, seed]);

  /** Mark the rounds from here on as an attempt at one strategy. */
  const attempt = useCallback(
    (id: string) => {
      const mark = rounds.length;
      setAttempts((previous) => {
        const next = new Map(previous);
        if (attempting) {
          const open = next.get(attempting);
          if (open) next.set(attempting, { ...open, to: mark });
        }
        next.set(id, { from: mark, to: null });
        return next;
      });
      setAttempting(id === attempting ? null : id);
    },
    [attempting, rounds.length],
  );

  const yours = (id: string): { wins: number; played: number } | null => {
    const range = attempts.get(id);
    if (!range) return null;
    const slice = rounds.slice(range.from, range.to ?? rounds.length);
    return { wins: slice.reduce((n, r) => n + (r.machineWon ? 1 : 0), 0), played: slice.length };
  };

  return (
    <Section
      id="lab"
      title="The strategy lab"
      intro={
        <>
          Five strategies you are invited to try. Each also runs as a script against a fresh machine
          over {ROUNDS} rounds, so you can compare what the sequence is worth with what you manage
          while trying to produce it. Those are different numbers, and the difference is the point.
        </>
      }
    >
      <div className="lab__head" aria-hidden="true">
        <span>Strategy</span>
        <span>Machine, scripted</span>
        <span>Machine, against you</span>
      </div>

      <div className="lab">
        {STRATEGIES.map((strategy) => {
          const result = results.get(strategy.id);
          const mine = yours(strategy.id);
          const live = attempting === strategy.id;
          return (
            <div
              className={`lab__row${strategy.isControl ? ' lab__row--control' : ''}`}
              key={strategy.id}
            >
              <h3 className="lab__name">{strategy.name}</h3>
              <span className={`lab__rate${result ? '' : ' lab__rate--pending'}`}>
                {result ? `${Math.round(result.rate * 100)}%` : '—'}
              </span>
              <span className={`lab__rate${mine && mine.played ? '' : ' lab__rate--pending'}`}>
                {mine && mine.played ? `${Math.round((mine.wins / mine.played) * 100)}%` : '—'}
              </span>

              <p className="lab__instruction">{strategy.instruction}</p>
              <span className="lab__ci">
                {result ? formatRate(result.machineWins, result.rounds) : null}
              </span>
              <span className="lab__yours">
                {mine
                  ? mine.played
                    ? `over ${mine.played} ${mine.played === 1 ? 'round' : 'rounds'}${live ? ', still going' : ''}`
                    : 'go and play'
                  : null}
              </span>

              <div className="lab__actions">
                <button className="lab__run" type="button" onClick={() => run(strategy.id)}>
                  Run the script
                </button>
                <button
                  className={`lab__run${live ? ' lab__run--live' : ''}`}
                  type="button"
                  onClick={() => attempt(strategy.id)}
                  aria-pressed={live}
                >
                  {live ? 'Stop attempting' : "I'll try this"}
                </button>
              </div>

              {result ? <p className="lab__verdict">{strategy.verdict}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="lab__actions lab__actions--footer">
        <button className="lab__run" type="button" onClick={runAll}>
          Run all five scripts
        </button>
      </div>

      <table className="visually-hidden">
        <caption>Strategy results</caption>
        <thead>
          <tr>
            <th scope="col">Strategy</th>
            <th scope="col">Machine, scripted</th>
            <th scope="col">Machine, against you</th>
            <th scope="col">Your rounds</th>
          </tr>
        </thead>
        <tbody>
          {STRATEGIES.map((strategy) => {
            const result = results.get(strategy.id);
            const mine = yours(strategy.id);
            return (
              <tr key={strategy.id}>
                <th scope="row">{strategy.name}</th>
                <td>{result ? `${Math.round(result.rate * 100)}%` : 'not run'}</td>
                <td>
                  {mine && mine.played ? `${Math.round((mine.wins / mine.played) * 100)}%` : 'not tried'}
                </td>
                <td>{mine?.played ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}
