import { useCallback, useState } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { Reveal } from '../../ui/Reveal';
import { verifySeals } from '../../engine/verify';
import type { SealAudit } from '../../engine/verify';
import './Seal.css';

const side = (move: 0 | 1) => (move === 0 ? 'left' : 'right');
/** Enough rows to see the pattern without printing a session. */
const SHOWN = 12;

/**
 * The commitment protocol, checked in front of the player.
 *
 * PRD §4.3 makes this the promise everything else rests on, and says it must
 * be visibly credible or the score means nothing. Until now the app met that
 * with a closed envelope and a sentence, which is exactly what an app that was
 * cheating would also show. The enforcement is real and lives in the referee's
 * types and in commitment.test.ts; a player sees neither of those.
 *
 * So the check runs here instead, on their own session, on demand. It is the
 * one section in the app whose subject is whether to believe the rest of it.
 */
export function Seal() {
  const store = useGameThrottled();
  const rounds = store.rounds;
  const [audit, setAudit] = useState<SealAudit | null>(null);
  const [checked, setChecked] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const run = useCallback(() => {
    const result = verifySeals(rounds, store.currentConfig, store.currentSeed);
    setAudit(result);
    setChecked(rounds.length);
    setAnnouncement(
      result.allMatch
        ? `All ${rounds.length} predictions reproduced from the presses that came before them.`
        : `Round ${(result.firstMismatch ?? 0) + 1} did not reproduce. Something is wrong.`,
    );
  }, [rounds, store]);

  const sample = audit ? audit.checks.slice(-SHOWN) : [];

  return (
    <Section
      id="seal"
      title="The seal, checked"
      eyebrow="the protocol"
      intro="The machine commits before it reads your press. That is the claim the score depends on, and a closed envelope is not evidence for it. This checks it against your own session."
    >
      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      <Reveal className="seal__lead">
        <p>
          A second machine is built from this session's seed and settings and walked forward
          through your presses. At each round it is asked to seal, and only then told what you did.
          Its commitment is compared with the one on record.
        </p>
        <p>
          If round 40 on record was reached by a machine that had seen your first 39 presses, then
          a machine given the same 39 presses reaches it again. The prediction cannot have depended
          on press 40, because the machine reproducing it has never been given press 40.
        </p>
      </Reveal>

      <Reveal className="seal__actions" delay={1}>
        <button className="button button--primary seal__run" type="button" onClick={run} disabled={rounds.length === 0}>
          {rounds.length === 0 ? 'Play a round first' : `Re-seal all ${rounds.length} rounds`}
        </button>
        {audit ? (
          <p className={`seal__verdict${audit.allMatch ? '' : ' seal__verdict--broken'}`}>
            {audit.allMatch
              ? `${checked} of ${checked} reproduced.`
              : `Round ${(audit.firstMismatch ?? 0) + 1} did not reproduce.`}
          </p>
        ) : null}
      </Reveal>

      {audit ? (
        <Reveal delay={2}>
          <table className="seal__table">
            <caption className="visually-hidden">
              The last {sample.length} rounds, re-sealed from the presses that preceded them
            </caption>
            <thead>
              <tr>
                <th scope="col">Round</th>
                <th scope="col">Presses it had</th>
                <th scope="col">Sealed then</th>
                <th scope="col">Seals now</th>
                <th scope="col">You pressed</th>
                <th scope="col">Same</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((check) => (
                <tr key={check.index}>
                  <th scope="row">{check.index + 1}</th>
                  <td>{check.historyLength}</td>
                  <td>{side(check.recorded)}</td>
                  <td>{side(check.recomputed)}</td>
                  <td>{side(check.actual)}</td>
                  <td className={check.matches ? 'seal__yes' : 'seal__no'}>
                    {check.matches ? 'yes' : 'no'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="seal__note">
            The second column is the point. It is always one less than the round number: the
            machine that produced each prediction had every press before it and none of the press
            it was predicting.
          </p>
        </Reveal>
      ) : null}

      {/*
        The limit of the demonstration, stated with it rather than left for a
        reader to find. An app cannot prove its own honesty from the inside and
        should not imply that it has.
      */}
      <Reveal as="p" className="seal__limit" delay={3}>
        What this cannot do: prove the original prediction was not reached some other way. Nothing
        running inside this program could, and an app claiming otherwise would be overstating it.
        What it shows is that every recorded prediction is a function of the presses before it and
        of nothing else, which is the property the claim rests on. The seed and settings are in the
        address bar, the session exports below, and the check is{' '}
        <code>verifySeals</code> in <code>src/engine/verify.ts</code>, so the same thing can be run
        outside this page by someone who does not trust the page to check itself.
      </Reveal>
    </Section>
  );
}
