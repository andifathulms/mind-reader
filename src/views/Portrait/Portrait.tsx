import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Figure, Section } from '../../ui/Section';
import { entropyStaircase } from '../../stats/entropy';
import { runLengths, switchRate } from '../../stats/runs';
import { serialCorrelation } from '../../stats/correlation';
import { ngramChiSquare } from '../../stats/chisquare';
import { formatRate, wilson } from '../../stats/interval';
import type { Move } from '../../engine/types';
import './Portrait.css';

/*
 * Chart geometry. The SVG scales to its container, so everything inside it
 * scales too, including the type — which is why a chart's box is drawn at the
 * size it will actually be shown at rather than at some canonical size and
 * stretched. The wide chart gets its own, larger box for the same reason.
 */
const W = 560;
const H = 200;
const PAD = { top: 14, right: 12, bottom: 28, left: 38 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const WIDE_W = 1120;
const WIDE_H = 280;
const WIDE_PAD = { top: 16, right: 16, bottom: 32, left: 44 };
const widePlotW = WIDE_W - WIDE_PAD.left - WIDE_PAD.right;
const widePlotH = WIDE_H - WIDE_PAD.top - WIDE_PAD.bottom;

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Enough sequence for the shape of a chart to mean anything. */
const MIN_ROUNDS = 25;

function Waiting({ have }: { have: number }) {
  return (
    <p className="portrait__empty">
      Not enough rounds yet. {have} of {MIN_ROUNDS}.
    </p>
  );
}

function WinRate({ wins, rounds }: { wins: number; rounds: number }) {
  const { low, high } = wilson(wins, rounds);
  const rate = rounds === 0 ? 0.5 : wins / rounds;
  const x = (p: number) => PAD.left + p * plotW;
  const h = 40;
  const y = PAD.top + 24;

  return (
    <svg className="portrait__chart" viewBox={`0 0 ${W} 120`} role="img" aria-label="Machine win rate with its 95% confidence interval">
      <line className="portrait__grid" x1={x(0)} y1={y - 8} x2={x(1)} y2={y - 8} />
      <line className="portrait__rule" x1={x(0.5)} y1={y - 12} x2={x(0.5)} y2={y + h + 8} />
      <rect className="portrait__span" x={x(low)} y={y} width={Math.max(1, x(high) - x(low))} height={h} />
      <rect
        className={`portrait__value${low > 0.5 || high < 0.5 ? ' portrait__value--clear' : ''}`}
        x={x(rate) - 1}
        y={y - 6}
        width="2"
        height={h + 12}
      />
      <text className="portrait__axis" x={x(0)} y={y + h + 22}>0%</text>
      <text className="portrait__axis" x={x(0.5)} y={y + h + 22} textAnchor="middle">50%</text>
      <text className="portrait__axis" x={x(1)} y={y + h + 22} textAnchor="end">100%</text>
    </svg>
  );
}

function Runs({ sequence }: { sequence: readonly Move[] }) {
  const buckets = runLengths(sequence, 8);
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.observed, b.expected)));
  const bandW = widePlotW / buckets.length;
  const y = (v: number) => WIDE_PAD.top + widePlotH - (v / max) * widePlotH;

  const curve = buckets
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${WIDE_PAD.left + bandW * (i + 0.5)} ${y(b.expected)}`)
    .join(' ');

  return (
    <svg
      className="portrait__chart portrait__chart--wide"
      viewBox={`0 0 ${WIDE_W} ${WIDE_H}`}
      role="img"
      aria-label="Run lengths against the geometric expectation for a fair coin"
    >
      <line
        className="portrait__grid"
        x1={WIDE_PAD.left}
        y1={WIDE_PAD.top + widePlotH}
        x2={WIDE_W - WIDE_PAD.right}
        y2={WIDE_PAD.top + widePlotH}
      />
      {buckets.map((b, i) => (
        <rect
          key={b.length}
          // Over or under the coin's expectation, in the arena's own two
          // colours. The comparison is the whole chart, and reading it off two
          // heights is work the colour can do instead.
          className={`portrait__bar portrait__bar--${b.observed >= b.expected ? 'over' : 'under'}`}
          style={{ '--bar-delay': `${i * 45}ms` } as CSSProperties}
          x={WIDE_PAD.left + bandW * i + 5}
          y={y(b.observed)}
          width={bandW - 10}
          height={Math.max(0, WIDE_PAD.top + widePlotH - y(b.observed))}
        />
      ))}
      <path className="portrait__expected" d={curve} pathLength={1} />
      {buckets.map((b, i) => (
        <text
          key={b.length}
          className="portrait__axis"
          x={WIDE_PAD.left + bandW * (i + 0.5)}
          y={WIDE_H - 10}
          textAnchor="middle"
        >
          {b.length === 8 ? '8+' : b.length}
        </text>
      ))}
      <text className="portrait__axis" x={WIDE_PAD.left - 8} y={WIDE_PAD.top + 8} textAnchor="end">
        {Math.round(max)}
      </text>
      <text
        className="portrait__axis"
        x={WIDE_PAD.left - 8}
        y={WIDE_PAD.top + widePlotH}
        textAnchor="end"
      >
        0
      </text>
    </svg>
  );
}

function Switches({ rate, opportunities }: { rate: number; opportunities: number }) {
  const x = (p: number) => PAD.left + p * plotW;
  const y = 40;
  const { low, high } = wilson(Math.round(rate * opportunities), opportunities);
  return (
    <svg className="portrait__chart" viewBox={`0 0 ${W} 100`} role="img" aria-label="Switch rate against 50%">
      <line className="portrait__grid" x1={x(0)} y1={y} x2={x(1)} y2={y} />
      <line className="portrait__rule" x1={x(0.5)} y1={y - 20} x2={x(0.5)} y2={y + 20} />
      <rect className="portrait__span" x={x(Math.min(0.5, rate))} y={y - 10} width={Math.max(1, Math.abs(x(rate) - x(0.5)))} height={20} />
      <rect className="portrait__value" x={x(rate) - 1} y={y - 16} width="2" height="32" />
      <line className="portrait__stem" x1={x(low)} y1={y} x2={x(high)} y2={y} strokeOpacity={0.45} />
      <text className="portrait__axis" x={x(0)} y={y + 34}>0%</text>
      <text className="portrait__axis" x={x(0.5)} y={y + 34} textAnchor="middle">50%, a coin</text>
      <text className="portrait__axis" x={x(1)} y={y + 34} textAnchor="end">100%</text>
    </svg>
  );
}

function Entropy({ sequence }: { sequence: readonly Move[] }) {
  const points = entropyStaircase(sequence, 5);
  const bandW = plotW / points.length;
  const y = (bits: number) => PAD.top + plotH - bits * plotH;

  return (
    <svg className="portrait__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Conditional entropy at orders 0 to 5, in bits per press">
      <line className="portrait__grid" x1={PAD.left} y1={y(1)} x2={W - PAD.right} y2={y(1)} />
      <line className="portrait__grid" x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} />
      {points.map((p, i) => (
        <rect
          key={p.order}
          className={`portrait__bar portrait__bar--${p.bits < 0.98 ? 'over' : 'even'}`}
          style={{ '--bar-delay': `${i * 45}ms` } as CSSProperties}
          x={PAD.left + bandW * i + 4}
          y={y(p.bits)}
          width={bandW - 8}
          height={Math.max(0, y(0) - y(p.bits))}
          opacity={p.reliable ? 1 : 0.28}
        />
      ))}
      {points.map((p, i) => (
        <text key={p.order} className="portrait__axis" x={PAD.left + bandW * (i + 0.5)} y={H - 8} textAnchor="middle">
          {p.order}
        </text>
      ))}
      <text className="portrait__axis" x={PAD.left - 6} y={y(1) + 4} textAnchor="end">1</text>
      <text className="portrait__axis" x={PAD.left - 6} y={y(0)} textAnchor="end">0</text>
    </svg>
  );
}

function Correlation({ sequence }: { sequence: readonly Move[] }) {
  const lags = serialCorrelation(sequence, 10);
  const bandW = plotW / lags.length;
  const mid = PAD.top + plotH / 2;
  const y = (r: number) => mid - (Math.max(-1, Math.min(1, r)) * plotH) / 2;
  const band = lags[0]?.band ?? 1;

  return (
    <svg className="portrait__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Serial correlation at lags 1 to 10">
      <rect className="portrait__band" x={PAD.left} y={y(Math.min(1, band))} width={plotW} height={Math.max(1, y(-Math.min(1, band)) - y(Math.min(1, band)))} />
      <line className="portrait__grid" x1={PAD.left} y1={mid} x2={W - PAD.right} y2={mid} />
      {lags.map((l, i) => {
        const cx = PAD.left + bandW * (i + 0.5);
        return (
          <g key={l.lag}>
            <line className="portrait__stem" x1={cx} y1={mid} x2={cx} y2={y(l.correlation)} opacity={l.significant ? 1 : 0.4} />
            <circle cx={cx} cy={y(l.correlation)} r="3" className="portrait__value" opacity={l.significant ? 1 : 0.4} />
            <text className="portrait__axis" x={cx} y={H - 8} textAnchor="middle">{l.lag}</text>
          </g>
        );
      })}
      <text className="portrait__axis" x={PAD.left - 6} y={y(1) + 8} textAnchor="end">+1</text>
      <text className="portrait__axis" x={PAD.left - 6} y={y(-1)} textAnchor="end">−1</text>
    </svg>
  );
}

export function Portrait() {
  const store = useGameThrottled();
  const sequence = store.history;
  const rounds = store.rounds;
  const version = store.slowVersion;

  const stats = useMemo(() => {
    const wins = rounds.reduce((n, r) => n + (r.machineWon ? 1 : 0), 0);
    return {
      wins,
      switches: switchRate(sequence),
      entropy: entropyStaircase(sequence, 5),
      runs: runLengths(sequence, 8),
      lags: serialCorrelation(sequence, 10),
      chi: ngramChiSquare(sequence, 4),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, rounds, version]);

  const n = sequence.length;
  const enough = n >= MIN_ROUNDS;
  const order1 = stats.entropy[1];
  const topPatterns = stats.chi.patterns.filter((p) => p.overproduced).slice(0, 6);
  const maxPattern = Math.max(1, ...topPatterns.map((p) => p.observed));

  return (
    <Section
      id="portrait"
      title="The portrait"
      intro="Six measurements of how you failed to be random. None of them is the win rate, and none of them depends on how the machine happened to do."
    >
      <div className="grid-two">
        <Figure
          title="Win rate"
          value={rounds.length ? pct(stats.wins / Math.max(1, rounds.length)) : '—'}
          note={<>The machine, {formatRate(stats.wins, rounds.length)}. The lighter span is the interval; early on it covers almost everything, which is what a short sample is worth.</>}
          table={
            <table>
              <tbody>
                <tr><th scope="row">Rounds</th><td>{rounds.length}</td></tr>
                <tr><th scope="row">Machine wins</th><td>{stats.wins}</td></tr>
                <tr><th scope="row">Rate</th><td>{rounds.length ? pct(stats.wins / rounds.length) : '—'}</td></tr>
                <tr><th scope="row">95% CI</th><td>{rounds.length ? `${pct(wilson(stats.wins, rounds.length).low)}–${pct(wilson(stats.wins, rounds.length).high)}` : '—'}</td></tr>
              </tbody>
            </table>
          }
        >
          <WinRate wins={stats.wins} rounds={rounds.length} />
        </Figure>

        <Figure
          title="Switch rate"
          value={n > 1 ? pct(stats.switches.rate) : '—'}
          note="How often you changed sides from one press to the next. A coin sits at 50%. People alternate substantially more than that."
          table={
            <table>
              <tbody>
                <tr><th scope="row">Switches</th><td>{stats.switches.switches}</td></tr>
                <tr><th scope="row">Opportunities</th><td>{stats.switches.opportunities}</td></tr>
                <tr><th scope="row">Rate</th><td>{n > 1 ? pct(stats.switches.rate) : '—'}</td></tr>
              </tbody>
            </table>
          }
        >
          {n > 1 ? <Switches rate={stats.switches.rate} opportunities={stats.switches.opportunities} /> : <Waiting have={n} />}
        </Figure>
      </div>

      <Figure
        title="Run lengths"
        wide
        note="Bars are your runs. The dashed curve is what a fair coin produces over the same number of runs. In 100 fair flips a run of six is near-certain."
        table={
          <table>
            <thead><tr><th scope="col">Length</th><th scope="col">Yours</th><th scope="col">A coin</th></tr></thead>
            <tbody>
              {stats.runs.map((b) => (
                <tr key={b.length}>
                  <th scope="row">{b.length === 8 ? '8 or more' : b.length}</th>
                  <td>{b.observed}</td>
                  <td>{b.expected.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        {enough ? <Runs sequence={sequence} /> : <Waiting have={n} />}
      </Figure>

      <div className="grid-two">
        <Figure
          title="Conditional entropy"
          value={order1 && enough ? `${order1.bits.toFixed(2)} bits` : '—'}
          note="Bits per press, given the last 0 to 5 presses. A fair coin is 1 bit at every order. Faded bars have too little sequence behind them to be worth reading."
          table={
            <table>
              <thead><tr><th scope="col">Order</th><th scope="col">Bits</th><th scope="col">Reliable</th></tr></thead>
              <tbody>
                {stats.entropy.map((p) => (
                  <tr key={p.order}>
                    <th scope="row">{p.order}</th>
                    <td>{p.bits.toFixed(3)}</td>
                    <td>{p.reliable ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {enough ? <Entropy sequence={sequence} /> : <Waiting have={n} />}
        </Figure>

        <Figure
          title="Serial correlation"
          note="Lags 1 to 10. The shaded band is two standard errors under an independent sequence: a stem inside it is noise, and only a stem outside it is a finding."
          table={
            <table>
              <thead><tr><th scope="col">Lag</th><th scope="col">r</th><th scope="col">Outside the band</th></tr></thead>
              <tbody>
                {stats.lags.map((l) => (
                  <tr key={l.lag}>
                    <th scope="row">{l.lag}</th>
                    <td>{l.correlation.toFixed(3)}</td>
                    <td>{l.significant ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {enough ? <Correlation sequence={sequence} /> : <Waiting have={n} />}
        </Figure>
      </div>

      <Figure
        title="Patterns you overproduce"
        value={enough ? (stats.chi.p < 0.0001 ? 'p < 0.0001' : `p = ${stats.chi.p.toFixed(4)}`) : '—'}
        note={`Chi-square on the sixteen four-press patterns, ${stats.chi.degreesOfFreedom} degrees of freedom. The ranked list is the finding; a chart of sixteen near-equal bars would bury it.`}
        table={
          <table>
            <thead><tr><th scope="col">Pattern</th><th scope="col">Yours</th><th scope="col">Expected</th></tr></thead>
            <tbody>
              {stats.chi.patterns.map((p) => (
                <tr key={p.pattern}>
                  <th scope="row">{p.pattern.replace(/0/g, 'L').replace(/1/g, 'R')}</th>
                  <td>{p.observed}</td>
                  <td>{p.expected.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        {enough ? (
          <div className="portrait__patterns">
            {topPatterns.map((p, i) => (
              <div
                className="portrait__pattern"
                key={p.pattern}
                style={{ '--bar-delay': `${i * 55}ms` } as CSSProperties}
              >
                <span className="portrait__pattern-code">{p.pattern.replace(/0/g, 'L').replace(/1/g, 'R')}</span>
                <span className="portrait__pattern-bar" style={{ width: `${(p.observed / maxPattern) * 100}%` }} />
                <span className="portrait__pattern-count">
                  {p.observed} vs {p.expected.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Waiting have={n} />
        )}
      </Figure>

      {/* PRD §5.1: two apps measuring the same quantity from opposite directions. */}
      {enough && order1 ? (
        <p className="portrait__cross-link">
          Your sequence carries {order1.bits.toFixed(2)} bits per press given the previous one,
          against 1 bit for a coin. A sequence below 1 bit per press is a sequence that
          compresses. Export it below and a compressor will find the same thing from the other
          direction.
        </p>
      ) : null}
    </Section>
  );
}
