# CLAUDE.md — Mind Reader

Build instructions for Claude Code. PRD.md is what and why. DESIGN.md is how it looks.

## Non-negotiables

1. **The prediction is locked before input is read.** This is enforced by types and by test,
   not by convention. See §3. If a code path exists where the machine could see the press
   before committing, the app is fraudulent.
2. **The machine sees press history only.** No timing, no coordinates, no tap position. The
   input to every predictor is a `Move[]` and nothing else — enforced by the function
   signature.
3. **Predictors cannot see each other.** Each gets the history and returns a guess. The
   mixer combines them. A predictor that could read another's output would be a different
   algorithm than the one named.
4. **Seeded PRNG, no `Math.random()`.** Sessions must be replayable.
5. **The engine is pure.** `src/engine/` imports nothing — no React, no DOM, no `Date` except
   through an injected clock.
6. **No network at runtime.**

## Stack

- Vite + React 18 + TypeScript, strict.
- Plain CSS with custom properties.
- No charting library. Six small charts, all bespoke, all trivial in SVG.
- No animation library. The animation budget here is one seal and one moving boundary.
- Vitest.

Zero runtime dependencies beyond React. This app should be tiny.

## Layout

```
/
├─ src/
│  ├─ engine/
│  │  ├─ rng.ts               # seeded PRNG
│  │  ├─ types.ts             # Move, Round, Session
│  │  ├─ predictors/
│  │  │  ├─ predictor.ts      # the interface
│  │  │  ├─ seer.ts           # Hagelbarger 1956
│  │  │  ├─ mrm.ts            # Shannon 1953
│  │  │  ├─ ngram.ts
│  │  │  ├─ backoff.ts
│  │  │  └─ levelk.ts
│  │  ├─ mixer.ts             # weighting, confidence, random fallback
│  │  ├─ referee.ts           # the commitment protocol — see §3
│  │  ├─ umpire.ts            # machine vs machine
│  │  └─ index.ts
│  ├─ stats/
│  │  ├─ entropy.ts
│  │  ├─ runs.ts
│  │  ├─ correlation.ts
│  │  ├─ chisquare.ts
│  │  └─ interval.ts          # Wilson score intervals
│  ├─ strategies/             # the strategy lab's scripted opponents
│  ├─ views/
│  │  ├─ Arena/               # the split screen, the boundary, the seal
│  │  ├─ Ensemble/            # five predictor weights, live
│  │  ├─ Portrait/            # the measurement charts
│  │  ├─ Rematch/             # machine vs machine
│  │  └─ Archive/             # the 1953 and 1956 reconstructions
│  ├─ state/
│  ├─ ui/
│  └─ styles/
└─ tests/
   ├─ fairness.test.ts        # the big one — 100k rounds vs PRNG
   ├─ commitment.test.ts
   ├─ historical.test.ts      # MRM beats SEER
   └─ stats.test.ts
```

## 1. Core types

```ts
type Move = 0 | 1;

interface Round {
  index: number;
  prediction: Move;          // what the machine committed to
  actual: Move;              // what the player did
  machineWon: boolean;
  confidence: number;        // 0..1 at commit time
  wasRandom: boolean;        // fell below the confidence threshold
  perPredictor: Array<{ id: PredictorId; guess: Move; weight: number }>;
}

interface Session {
  seed: number;
  rounds: Round[];
  config: Config;
}
```

`perPredictor` records what each model *would* have played, whether or not it drove the
mixture. The ensemble view needs this and recomputing it later would be wrong — weights have
moved on.

## 2. The predictor interface

```ts
interface Predictor {
  id: PredictorId;
  name: string;
  citation: Citation | null;
  reset(): void;
  /** History is the player's presses, oldest first. Nothing else is available. */
  predict(history: readonly Move[]): { guess: Move; confidence: number };
  observe(actual: Move): void;
}
```

`predict` takes `readonly Move[]` and no other argument. That signature is the enforcement
of PRD §7.3: there is nowhere to pass timing or position even if someone wanted to.

`citation` is non-null for SEER and MRM and points at the primary sources. The n-gram,
backoff and level-k predictors cite their literature where one exists and are marked as
modern constructions where it does not.

## 3. The referee — the commitment protocol

This is the app's integrity mechanism.

```ts
interface SealedPrediction {
  readonly commit: Move;
  readonly confidence: number;
  readonly perPredictor: ReadonlyArray<{ id: PredictorId; guess: Move; weight: number }>;
  readonly sealedAt: number;
}

class Referee {
  /** Produces a sealed prediction. Must be called before input is accepted. */
  seal(): SealedPrediction;
  /** Accepts the player's move against an existing seal. Throws if none. */
  resolve(seal: SealedPrediction, actual: Move): Round;
}
```

`resolve` takes the seal as an argument rather than reading it from internal state, so a
round cannot be resolved without a seal that was produced earlier. There is no code path
that computes a prediction during `resolve`.

`commitment.test.ts` asserts:
- `resolve` throws when called without a seal.
- A seal produced for history H yields the same commit regardless of what `actual` is.
- Freezing the RNG and replaying produces identical seals.

The UI mirrors this: the input handler is not attached until the seal exists.

## 4. SEER and MRM

Implement from the primary sources listed in PRD §6.1. **Do not implement from the summary
in PRD §2.1** — it is a description, not a specification.

What is established and can be relied on as a shape check:

- SEER holds a small number of situations derived from binary facts about the last two
  rounds, each with a counter that saturates at a small bound, deliberately so the machine
  discards old history.
- MRM is a simplified model of SEER and beats it.

Everything else — the exact facts forming the state, the counter bounds, the update rule, the
tie behaviour — comes from the papers.

Where a detail cannot be resolved from the sources, record it in
`src/engine/predictors/NOTES.md` with what was assumed and why. That file is shipped and
linked from the Archive view. An honest note about an unresolved detail is worth more than a
confident guess, and this app is partly a historical reconstruction — the reconstruction's
uncertainties are part of the artifact.

`historical.test.ts` runs MRM against SEER for 10,000 rounds through the umpire and asserts
MRM finishes ahead. If it does not, the implementations are wrong.

## 5. The mixer

```ts
interface MixerConfig {
  decay: number;          // exponential weight decay, default 0.95
  confidenceFloor: number; // below this, play randomly. default 0.55
  minRounds: number;      // warm-up. default 20
}
```

Weight update: each predictor's weight multiplies by `decay` and increments on a correct
guess. Normalise. The mixture's confidence is the weighted agreement of the predictors — full
agreement gives high confidence, an even split gives none.

Below `minRounds`, or below `confidenceFloor`, the machine draws from the seeded PRNG and
sets `wasRandom`. This is the honesty mechanism from PRD §4.4 and §4.5, and `fairness.test.ts`
depends on it: against a real random source the confidence never sustains, so the machine
falls back constantly and converges to 50%.

**If `fairness.test.ts` fails, do not tune it until it passes.** A machine that beats a PRNG
has a bug that is almost certainly leaking the future into the prediction, and that bug will
also be silently inflating its score against humans.

## 6. Statistics

Wilson score intervals for the win rate, not normal approximation — the sample is small early
and the normal approximation is badly wrong near the boundaries, which is exactly when the
player is most likely to over-read their lead.

Conditional entropy shares its implementation approach with Compression Lab. If that code is
reusable, reuse it; the two apps measure the same quantity and should not disagree.

Run-length distribution compared against the geometric expectation for a fair coin, with the
expected curve drawn alongside rather than described.

## 7. Performance

Trivial, but latency matters more than throughput. Input to reveal must be under 80 ms
(PRD §8.5). That means:

- Seal the *next* round's prediction immediately after the current reveal, so the machine is
  never computing while the player is waiting.
- No layout thrash on reveal. The boundary and the seal are transforms.
- No React re-render of the chart panels on every press. Charts update on a throttle;
  the arena updates immediately.

The arena and the analysis have different update rates and should be separate render trees.

## 8. Animation

Two things carry the game. The rest is arrival, and it is governed by one rule: **nothing that
moves may report anything the readouts do not already report.**

**The boundary** between the player's territory and the machine's moves with the score,
continuously, tracking the running win rate with no easing. It is a live readout, not a
transition. Its own past is drawn behind it as a trail on the same scale — the same quantity
over time, not a projection, and not smoothed beyond the shrinkage the boundary already
applies.

**The seal** opens on reveal. Fast — 120 ms — because the game's feel depends on it.

**One pulse** runs the boundary on reveal, in the colour of the mark just laid. It is the same
on a win as on a loss and carries nothing the marks and the scores do not. DESIGN.md §6.4 is
the test anything else proposed here has to pass.

**Arrival**: everything below the arena rises and fades as it is scrolled into, once, through
one shared IntersectionObserver. Bars grow from their own feet; traces wipe in left to right
in the direction the session was played. A reveal is a flourish and nothing may depend on one
to become visible — where the observer is missing, the element is shown immediately.

The house rule applies as usual: continuous control maps directly, discrete change animates.
Here the only continuous quantity is the score.

`prefers-reduced-motion: reduce` is one token, `--still`, not a second stylesheet: it is 0
normally and 1 under the query, and every decorative animation is written so a `--still` of 1
lands it at its final state before the first frame. The seal opens with no animation and the
boundary jumps.

Nothing in the arrival choreography may touch the press path. Input to reveal stays under
80 ms (§7).

## 9. State and URL

Config and seed serialise to the URL. Press history does not — it is a session, and a session
belongs to the person who played it.

Export is explicit: JSON with the full session, CSV with the round-by-round sequence for
analysis elsewhere.

## 10. Copy

English, sentence case.

The machine does not taunt. Not a single line of copy gloats, encourages, or comments on
performance. It reports. A machine that says "gotcha!" is a toy; a machine that silently
reports 68% is unsettling, and unsettling is the correct register.

Terminology is precise: the machine *predicts*, it does not *read*. Shannon's question mark
(PRD, header note) belongs in the interface, once.

Confidence intervals are stated, not implied: `68% over 140 rounds (95% CI: 60–75%)`.

The Archive view quotes the historical sources briefly and cites them fully. Keep quotations
short and let the reconstructions carry the weight — the machines are the artifact, not the
prose about them.

## 11. Build order

Do not build the arena before step 4 passes.

1. RNG, types, referee, `commitment.test.ts`.
2. N-gram and backoff predictors. Mixer with confidence and fallback.
3. `fairness.test.ts` against a seeded PRNG over 100,000 rounds. **Gate.**
4. SEER and MRM from the primary sources, `historical.test.ts`. **Gate.**
5. Design tokens, the arena: split ground, boundary, seal, two targets. Tune latency here
   before adding anything else — if it does not feel immediate, nothing else matters.
6. Level-k predictor.
7. Ensemble view.
8. Statistics and the portrait.
9. Strategy lab.
10. Rematch view with the umpire.
11. Archive view, NOTES.md link, citations.
12. Reduced motion, keyboard, export, mobile, Lighthouse.

## 12. Deployment

GitHub Pages via Actions. CI: typecheck → lint → test → build. Deploy only on green.
