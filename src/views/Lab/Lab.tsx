import { useCallback, useMemo, useState } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { STRATEGIES } from '../../strategies';
import { runStrategy } from '../../strategies/run';
import type { StrategyResult } from '../../strategies/run';
import { formatRate } from '../../stats/interval';
import './Lab.css';

const ROUNDS = 500;

/**
 * The strategy lab.
 *
 * Each row is a named strategy, what the machine scores when a script runs it
 * perfectly, and what you scored on the rounds you have played. The gap between
 * those two columns is the whole app.
 *
 * Three of the five scripted rows hold the machine to 50%: the coin, the digits
 * of pi, and letters from a book. That is the honest finding and it is a
 * sharper one than "only the coin works" — what separates the coin is not its
 * mathematics but that you can keep executing it. The other two are perfectly
 * good sequences you cannot reliably produce.
 */
export function Lab() {
  const store = useGameThrottled();
  const [results, setResults] = useState<Map<string, StrategyResult>>(new Map());

  const config = store.currentConfig;
  const seed = store.currentSeed;

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

  const yourRate = useMemo(() => {
    const rounds = store.rounds;
    const wins = rounds.reduce((n, r) => n + (r.machineWon ? 1 : 0), 0);
    return { wins, rounds: rounds.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.rounds, store.slowVersion]);

  return (
    <Section
      id="lab"
      title="The strategy lab"
      intro={
        <>
          Five strategies you are invited to try. Each row also runs as a script against a fresh
          machine over {ROUNDS} rounds, so you can compare what the sequence is worth with what you
          manage while trying to produce it. Those are different numbers, and the difference is the
          whole point.
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
          return (
            <div
              className={`lab__row${strategy.isControl ? ' lab__row--control' : ''}`}
              key={strategy.id}
            >
              <h3 className="lab__name">{strategy.name}</h3>
              <span className={`lab__rate${result ? '' : ' lab__rate--pending'}`}>
                {result ? `${Math.round(result.rate * 100)}%` : '—'}
              </span>
              <span className="lab__yours">
                {yourRate.rounds > 0
                  ? `${Math.round((yourRate.wins / yourRate.rounds) * 100)}% over ${yourRate.rounds}`
                  : '—'}
              </span>
              <p className="lab__instruction">{strategy.instruction}</p>
              {result ? (
                <p className="lab__ci">{formatRate(result.machineWins, result.rounds)}</p>
              ) : null}
              {result ? <p className="lab__verdict">{strategy.verdict}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="lab__actions">
        <button className="lab__run" type="button" onClick={runAll}>
          Run all five
        </button>
        {STRATEGIES.map((strategy) => (
          <button
            className="lab__run"
            type="button"
            key={strategy.id}
            onClick={() => run(strategy.id)}
          >
            Run {strategy.name.toLowerCase()}
          </button>
        ))}
      </div>
    </Section>
  );
}
