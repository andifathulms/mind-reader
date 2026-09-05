import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { Demo } from './Demo';
import { rematch, settledWeights } from './figures';
import type { WeightRow } from './figures';
import type { PredictorId } from '../engine';
import '../styles/base.css';
import './Landing.css';

/** Where the arena lives. The landing page is a door, not a replacement for it. */
const ARENA = import.meta.env.BASE_URL;

const PREDICTOR_NAMES: Record<PredictorId, string> = {
  seer: 'SEER',
  mrm: 'MRM',
  ngram: 'N-gram',
  backoff: 'Backoff',
  levelk: 'Level-k',
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * The ensemble band, drawn from weights the mixer actually settled on rather
 * than from five numbers chosen to look convincing. Segments are ordered by
 * weight so the band reads as a ranking, and the smallest ones keep a floor
 * width so a predictor that lost cannot vanish and take its label with it.
 */
function Band({ rows }: { rows: readonly WeightRow[] }) {
  const ordered = [...rows].sort((a, b) => b.weight - a.weight);
  return (
    <ul className="band">
      {ordered.map((row) => (
        <li
          key={row.id}
          className="band__segment"
          style={{
            flexGrow: Math.max(row.weight, 0.04),
            background: `var(--p-${row.id})`,
          }}
        >
          <span className="band__name">{PREDICTOR_NAMES[row.id]}</span>
          <span className="band__weight numeral">{pct(row.weight)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The two figures that need the engine to run before they can be stated. Both
 * are computed after mount rather than during it: they are a few million
 * counter updates between them, and the hero should paint first.
 */
interface Figures {
  weights: readonly WeightRow[];
  rate: number;
  mrmShare: number;
}

const REMATCH_ROUNDS = 2_000;
const REMATCH_SEEDS = [1, 2, 3, 5];
const REMATCH_EXCHANGES = REMATCH_ROUNDS * REMATCH_SEEDS.length * 2;

function useFigures(): Figures | null {
  const [figures, setFigures] = useState<Figures | null>(null);

  useEffect(() => {
    let live = true;
    const id = window.setTimeout(() => {
      const { rows, rate } = settledWeights();
      const share = rematch(REMATCH_ROUNDS, REMATCH_SEEDS);
      if (live) setFigures({ weights: rows, rate, mrmShare: share });
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, []);

  return figures;
}

export function Landing() {
  const figures = useFigures();

  return (
    <>
      <a className="skip" href="#thesis">
        Skip to the description
      </a>

      <header className="masthead">
        <span className="masthead__name">Mind reader</span>
        <nav className="masthead__nav">
          <a href="#machines">The machines</a>
          <a href="#commitment">The seal</a>
          <a className="button button--quiet" href={ARENA}>
            Play a session
          </a>
        </nav>
      </header>

      {/* 1. Hero. The split is the product's own structure: the reader's ground
          on the left, the machine's on the right, with the machine running. */}
      <section className="hero">
        <div className="hero__yours">
          <h1 className="hero__headline">
            The optimal move is public. You still cannot play it.
          </h1>
          <p className="hero__sub">
            Matching pennies against five models of you. The machine seals its guess before your
            press is read.
          </p>
          <div className="hero__actions">
            <a className="button" href={ARENA}>
              Play a session
            </a>
            <a className="link" href="#commitment">
              How the seal works
            </a>
          </div>
        </div>
        <div className="hero__machine on-machine">
          <Demo />
        </div>
      </section>

      {/* 2. The thesis. One statement, one number, nothing between them. */}
      <section className="thesis on-machine" id="thesis">
        <Reveal as="div" className="thesis__body">
          <h2>A fair coin ties, forever.</h2>
          <p>
            Von Neumann settled matching pennies before the machines existed. Flip a fair coin and
            you tie at exactly half against any opponent, including this one. So the machine cannot
            beat a correct player. It wins because you cannot execute a strategy you already know,
            and the counter-strategy is published and simple too.
          </p>
        </Reveal>
        <Reveal as="figure" className="thesis__figure" delay={1}>
          <span className="thesis__number numeral">50%</span>
          <figcaption>
            The ceiling against a genuinely random opponent. A test holds the machine to it over
            100,000 rounds of seeded noise. If it ever wins there, the build is broken.
          </figcaption>
        </Reveal>
      </section>

      {/* 3. The reconstructions. Archive register: the monospace and the warmer
          paper are the app's own citation voice. */}
      <section className="machines" id="machines">
        <Reveal as="div" className="machines__intro">
          <span className="eyebrow">Reconstructions</span>
          <h2>Two Bell Labs machines, rebuilt from the papers.</h2>
        </Reveal>

        <Reveal as="article" className="machines__card machines__card--wide">
          <h3>MRM</h3>
          <p className="machines__cite">
            Claude Shannon, <cite>A Mind-Reading (?) Machine</cite>, Bell Laboratories memorandum,
            18 March 1953.
          </p>
          <p>
            Shannon's memorandum opens by crediting Hagelbarger and describing his own device as a
            simplified version of it. It keeps a small model of what you tend to do after you win
            and after you lose. It won anyway.
          </p>
        </Reveal>

        <Reveal as="article" className="machines__card" delay={1}>
          <h3>SEER</h3>
          <p className="machines__cite">
            David Hagelbarger, <cite>SEER, A Sequence Extrapolating Robot</cite>, IRE Transactions,
            1956.
          </p>
          <p>
            Its entire memory is three yes-or-no facts about the last two rounds, giving eight
            situations. Each holds a counter that saturates at three, so the machine deliberately
            forgets what you used to do.
          </p>
        </Reveal>

        <Reveal as="p" className="machines__note" delay={2}>
          Both are implemented from the primary sources rather than from a modern summary. Where a
          detail could not be resolved from the papers it is written down as an assumption in the
          shipped notes, not guessed at quietly.
        </Reveal>
      </section>

      {/* 4. The ensemble. The band is the figure; the prose is the caption. */}
      <section className="ensemble on-machine">
        <Reveal as="div" className="ensemble__lead">
          <h2>Five models of you, competing.</h2>
          <p>
            Each predictor sees your press history and nothing else. No timing, no coordinates, no
            tap position. The mixer weights them by how right they have recently been, and the
            weights move while you play. That is the machine changing its mind about who you are.
          </p>
        </Reveal>

        <Reveal as="div" className="ensemble__band" delay={1} rise={0}>
          {figures ? (
            <Band rows={figures.weights} />
          ) : (
            <div className="band band--waiting" aria-hidden="true" />
          )}
        </Reveal>

        <Reveal as="p" className="ensemble__caption" delay={2}>
          {figures ? (
            <>
              Where the weights settle after 400 rounds against a sequence that alternates more
              often than chance, which is the most common way a person fails to be random. The
              machine took {pct(figures.rate)} of the rounds it was confident enough to predict.
              Computed in this browser a moment ago, not written into the page.
            </>
          ) : (
            'Running four hundred rounds through the mixer.'
          )}
        </Reveal>
      </section>

      {/* 5. The commitment protocol. Three steps, one rail, no stage numbers. */}
      <section className="protocol" id="commitment">
        <Reveal as="h2" className="protocol__title">
          It commits before it can see you.
        </Reveal>
        <ol className="protocol__steps">
          <Reveal as="li" className="protocol__step">
            <h3>Seal</h3>
            <p>
              The prediction is computed from your history alone and frozen. The input handler is
              not attached until the seal exists.
            </p>
          </Reveal>
          <Reveal as="li" className="protocol__step" delay={1}>
            <h3>Press</h3>
            <p>
              Your move is accepted against that seal, which is handed in as an argument. There is
              no path through this step that computes a prediction.
            </p>
          </Reveal>
          <Reveal as="li" className="protocol__step" delay={2}>
            <h3>Open</h3>
            <p>
              The seal opens and the round is recorded. A test freezes the generator, replays the
              session, and asserts the commit never moved.
            </p>
          </Reveal>
        </ol>
        <Reveal as="p" className="protocol__note" delay={3}>
          If a code path existed where the machine could see the press before committing, the score
          would be a lie. The signature of every predictor is the enforcement: it takes a list of
          past presses and there is nowhere to pass anything else.
        </Reveal>
      </section>

      {/* 6. The portrait. An uneven grid, because the measures are not of equal
          weight and a row of matching cards would say they were. */}
      <section className="portrait">
        <Reveal as="h2" className="portrait__title">
          A win rate is thin. It measures the shape of the failure.
        </Reveal>
        <div className="portrait__grid">
          <Reveal as="article" className="portrait__item portrait__item--lead">
            <h3>Conditional entropy</h3>
            <p>
              How much your next press is determined by the last few. A fair coin sits at one bit
              and stays there. People do not.
            </p>
          </Reveal>
          <Reveal as="article" className="portrait__item" delay={1}>
            <h3>Run lengths</h3>
            <p>
              Drawn against the geometric curve a fair coin would produce, rather than described in
              a sentence next to it.
            </p>
          </Reveal>
          <Reveal as="article" className="portrait__item" delay={2}>
            <h3>Serial correlation</h3>
            <p>Whether a press pulls the next one with it, and at what lag.</p>
          </Reveal>
          <Reveal as="article" className="portrait__item" delay={1}>
            <h3>N-gram balance</h3>
            <p>
              A chi-square test on which short patterns you produce, and which you avoid without
              noticing.
            </p>
          </Reveal>
          <Reveal as="article" className="portrait__item portrait__item--tail" delay={2}>
            <h3>Wilson intervals</h3>
            <p>
              Every rate is stated with its interval, using the Wilson score rather than the normal
              approximation. The sample is smallest exactly when you are most likely to over-read
              your lead.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. The rematch. The historical claim on one side, this build answering
          the same question on the other. */}
      <section className="rematch on-machine">
        <Reveal as="div" className="rematch__body">
          <h2>In 1953 the two machines played each other.</h2>
          <p>
            Shannon and Hagelbarger built an umpire so their devices could meet. The simpler machine
            won. Hagelbarger recorded it as about 55 to 45.
          </p>
          <p className="rematch__quote">
            "The agility of the small machine triumphed, and it beat the larger one about 55-45."
          </p>
        </Reveal>
        <Reveal as="figure" className="rematch__figure" delay={1}>
          <div className="rematch__score">
            <span className="rematch__side">
              <span className="rematch__label">MRM</span>
              <span className="rematch__value numeral">
                {figures ? pct(figures.mrmShare) : '··'}
              </span>
            </span>
            <span className="rematch__side rematch__side--muted">
              <span className="rematch__label">SEER</span>
              <span className="rematch__value numeral">
                {figures ? pct(1 - figures.mrmShare) : '··'}
              </span>
            </span>
          </div>
          <figcaption>
            This reconstruction asked the same question just now, over{' '}
            {REMATCH_EXCHANGES.toLocaleString('en')} exchanges and both umpire roles. It is a
            validation of the two implementations, not a target they were tuned towards.
          </figcaption>
        </Reveal>
      </section>

      {/* 8. The door, and the receipts. */}
      <section className="close on-machine">
        <Reveal as="div" className="close__body">
          <h2>Sit down at it.</h2>
          <p>
            The machine draws at random for the first twenty rounds and whenever its confidence
            falls, and it tells you when it is doing so. It reports and it does not comment.
          </p>
          <a className="button button--large" href={ARENA}>
            Play a session
          </a>
        </Reveal>
      </section>

      <footer className="colophon">
        <p>
          Built from Shannon's 1953 memorandum and Hagelbarger's 1956 paper. No network at runtime,
          no accounts, no storage. Nothing you press leaves this device.
        </p>
      </footer>
    </>
  );
}
