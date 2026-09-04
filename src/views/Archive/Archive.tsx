import { Section } from '../../ui/Section';
// The implementation notes ship with the app rather than living in the repo
// only, because the Archive's claim to credibility rests on them being here.
import notes from '../../engine/predictors/NOTES.md?raw';
import './Archive.css';

/**
 * The Archive.
 *
 * The disclosure sits at the top, in plain language, because a machine that
 * claims to predict you owes the reader an exact account of what it can see
 * (PRD §7.3). Below it, the two machines as built, quoted briefly and cited in
 * full, and the reconstruction's unresolved details linked directly.
 *
 * Those unresolved details are not a weakness to hide. They are the honest
 * seams, and showing them is what makes the rest credible.
 */
export function Archive() {
  return (
    <Section id="archive" title="The archive" eyebrow="sources" ground="archive">
      <div className="archive">
        <div className="archive__disclosure">
          <p>
            What the machine can see: the sequence of presses you have made, and nothing else.
          </p>
          <p>
            Not how long you took. Not where on the button you tapped. Not which key you used, not
            the cursor, not the accelerometer, not anything about you at all beyond left, right,
            left. Reaction time is a genuinely strong signal and this machine does not use it. If a
            future version ever did, that would have to be said here first and said loudly, because
            using it quietly would make everything else on this page a lie.
          </p>
          <p>
            Nothing leaves this device. There are no network requests while the app is running and
            no analytics. Your session exists in this tab and stops existing when you close it,
            unless you export it yourself.
          </p>
        </div>

        <p>
          Shannon called his 1953 memorandum <em>A Mind-Reading (?) Machine</em>. The question mark
          is his. It is the honest framing, and it belongs at the top of anything built from his
          design: the machine is not reading anything. It is exploiting a failure.
        </p>

        <div className="archive__machines">
        <div className="archive__machine">
          <p className="archive__year" aria-hidden="true">
            1956
          </p>
          <h3 className="archive__name">SEER</h3>
          <p>
            David Hagelbarger's SEquence Extrapolating Robot, built from relays at Bell
            Laboratories. Its entire memory is three yes-or-no facts about the last two plays —
            whether it won the play before last, whether it played the same or differently last
            time, whether it won the last play — giving eight situations. Each situation holds a
            reversible counter and a record of whether the machine has been winning there.
          </p>
          <blockquote className="archive__quote">
            “The stops at +3 and −3 in effect make the machine forget ancient history.”
          </blockquote>
          <p>
            The saturation is deliberate. A counter that could run away would hold a player to a
            habit they had already dropped.
          </p>
          <p className="archive__cite">
            D. W. Hagelbarger, <em>SEER, A SEquence Extrapolating Robot</em>, IRE Transactions on
            Electronic Computers, EC-5(1), March 1956, pp. 1–7.
          </p>
        </div>

        <div className="archive__machine">
          <p className="archive__year" aria-hidden="true">
            1953
          </p>
          <h3 className="archive__name">MRM</h3>
          <p>
            Claude Shannon's machine, described in a memorandum of 18 March 1953 that opens by
            crediting Hagelbarger and calling his own device a simplified version of it. It keeps
            the same eight situations, but computes them from the opponent's point of view rather
            than its own — it models the player instead of its own play, which is what the title is
            pointing at.
          </p>
          <p>
            It holds one thing per situation: what the opponent did the last two times that
            situation arose. Where they did the same thing twice it plays to the habit; where they
            did not, it plays at random. It drops SEER's eight counters entirely, which is how
            Hagelbarger could write that Shannon “has built a machine using about half as many
            relays”.
          </p>
          <p className="archive__verdict">It won.</p>
          <p className="archive__cite">
            C. E. Shannon, <em>A Mind-Reading (?) Machine</em>, Bell Laboratories memorandum, 18
            March 1953. Reprinted in <em>Claude Elwood Shannon: Collected Papers</em>, IEEE Press,
            1993, pp. 688–690.
          </p>
        </div>

        </div>

        <div className="archive__seams">
          <h3 className="archive__name">The seams</h3>
          <p>
            Both machines here are reconstructions, built from the papers rather than from a modern
            description. Five details could not be resolved from the sources:
          </p>
          <ul className="archive__seam-list">
            <li>— what SEER does when its counter sits at exactly zero</li>
            <li>— whether MRM follows a register it has not filled yet</li>
            <li>— what either machine plays before there are two plays to remember</li>
            <li>— which of the two the umpire turned around</li>
            <li>— the numbering of the eight situations</li>
          </ul>
          <p>
            Each is recorded in the implementation notes with the assumption made and the reason
            for it. Those notes ship with this app and are part of it — they are printed in full
            below. An honest note about an unresolved detail is worth more than a confident guess.
          </p>
          <details className="archive__notes">
            <summary>Implementation notes, in full</summary>
            <pre>{notes}</pre>
          </details>
          <p>
            These reconstructions give MRM 57.9 to SEER's 42.1 over ten thousand plays, averaged
            over both umpire roles. Hagelbarger recorded “about 55-45”; a 2020 reimplementation
            measured 55.8 to 44.2. A little wider than either, which is roughly what five
            assumptions should cost.
          </p>
        </div>

        <div className="archive__sources">
          <h3 className="archive__name">Sources</h3>
          <ul>
            <li>
              C. E. Shannon, <em>A Mind-Reading (?) Machine</em>, Bell Laboratories memorandum, 18
              March 1953. Reprinted in <em>Claude Elwood Shannon: Collected Papers</em>, IEEE Press,
              1993, pp. 688–690.
            </li>
            <li>
              D. W. Hagelbarger, <em>SEER, A SEquence Extrapolating Robot</em>, IRE Transactions on
              Electronic Computers, EC-5(1), March 1956, pp. 1–7.
            </li>
            <li>
              M. Breazu, D. Volovici, D. Morariu &amp; R. G. Crețulescu,{' '}
              <em>On Hagelbarger's and Shannon's matching pennies playing machines</em>,
              International Journal of Advanced Statistics and IT&amp;C for Economics and Life
              Sciences, X(1), December 2020. DOI 10.2478/ijasitels-2020-0003.
            </li>
            <li>
              The n-gram, backoff and level-k models are modern constructions with no single primary
              source. They are not reconstructions of anything and should not be read as historical.
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
