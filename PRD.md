# Mind Reader — Product Requirements

**Name:** Mind Reader
**Descriptor:** The optimal move is known, published, and simple. You still cannot make it.
**Type:** Static single-page application. No backend, no network at runtime.
**Deploy target:** GitHub Pages.
**Interface language:** English.

> Shannon titled his 1953 memorandum *A Mind-Reading (?) Machine*. The question mark is his,
> and it should survive into the interface somewhere. His own hedge is the honest framing:
> the machine is not reading anything. It is exploiting a failure.

---

## 1. The thesis

Matching pennies has a provably optimal strategy: flip a fair coin. Play it and you tie at
exactly 50% against any opponent, forever. Von Neumann settled this before the machines
existed.

So the machine cannot beat a correct player. If the input is genuinely random, the machine
can only reach 50% — otherwise it would be predicting a random sequence, which is a
contradiction.

The machine wins because you cannot execute a strategy you already know.

And it is worse than that. The counter-strategy is also published and simple. You can read
it, understand it completely, and still not run it in your head while playing.

**That gap — between a strategy that is optimal, published, and trivial to describe, and
your inability to perform it — is the app.**

This is the same shape as the rest of the family. In Compression Lab the entropy everyone
quotes is model-dependent. In Mixed Traffic Simulator the constant is not constant. In Query
Planner the plan is chosen from a false belief. Here: the correct move is known and you
cannot make it.

## 2. What already exists, and how this differs

The basic version of this has been built many times, including a good public
implementation at aaronsonoracle.com and a long tail of student projects. **Rebuilding a
single n-gram predictor is not a portfolio piece.** Four things make this one different, and
all four are in v1.

### 2.1 The historical machines, reconstructed

Hagelbarger's SEER and Shannon's MRM are real artifacts with published designs, and neither
has been built as an interactive object anyone can play.

SEER's entire memory is three yes-or-no facts about the last two rounds, giving eight
situations, each holding a small counter that saturates at ±3 — the saturation is
deliberate, so the machine forgets old history.

Shannon's memorandum of 18 March 1953 opens by crediting Hagelbarger and describing his own
device as a simplified version of it. It won anyway.

**Both must be implemented from the primary sources**, not from a modern description. See
§6.1 — the exact state decomposition is to be read off the papers, not inferred from this
document.

### 2.2 The historical rematch

Shannon and Hagelbarger built an umpire machine and had the two devices play each other.
Shannon's simpler machine won. A 2020 reimplementation confirmed MRM beats SEER, and found
that a simple contextual predictor beats both.

Stage that match live: machine against machine, umpire between them, running at speed.

### 2.3 The ensemble — the app's hero

Five predictors run simultaneously against the same player, each with a live weight based on
recent accuracy. The mixture makes the actual move.

What the user watches is **five competing models of themselves**, rising and falling. Switch
strategy mid-session — start alternating, start copying letters from a book — and the
weights visibly shift as a different model takes over.

That is a picture of the machine changing its mind about who you are, and it does not exist
anywhere.

### 2.4 The predictability portrait

Win rate alone is thin. The app measures the specific ways a person fails to be random
(§5), producing a portrait that is different for different people and different for the same
person under different strategies.

## 3. Scope

### In

- Five predictors (§4.1) plus the mixer.
- Both historical machines, playable individually and against each other.
- The commitment protocol (§4.3) and the confidence threshold (§4.4).
- Full measurement layer (§5).
- Strategy lab (§5.6).
- Session export.

### Out

- Rock-paper-scissors and other games. Matching pennies only. The binary case is where the
  game theory is clean and the visualisation is legible.
- Accounts, leaderboards, cross-device history. A session is a session.
- Any server-side model. Everything runs in the browser.
- Machine learning beyond the five specified models. A neural predictor would win more and
  explain less.

## 4. The engine

### 4.1 The five predictors

| Predictor | Basis | Note |
|---|---|---|
| **SEER** | Hagelbarger 1956 | 8 situations, saturating counters at ±3 |
| **MRM** | Shannon 1953 | Simplified SEER; models the opponent's win/change behaviour |
| **N-gram** | Fixed order, default 5 | The Aaronson-style baseline; a count table over the last n presses |
| **Backoff** | Variable order | Tries order 5, falls back through 4, 3, 2, 1 until a context has enough evidence |
| **Level-k** | Cognitive hierarchy | Models the player as reasoning about the machine, at depth 1, 2 or 3 |

Each implements one interface and each is individually selectable, so a user can play any
one alone. The level-k model is the one that catches a player who is deliberately
second-guessing, which is what most people do once they realise they are losing.

### 4.2 The mixer

Weights update on recent accuracy with exponential decay, so a predictor that was right ten
presses ago matters less than one that was right two presses ago. The decay constant is a
control.

The mixture is the machine's actual move. Individual predictors' guesses are recorded
regardless, so the ensemble view can show what each *would* have played.

### 4.3 The commitment protocol

Non-negotiable and it must be visibly credible, or the score means nothing to the user.

1. The machine computes and locks its prediction.
2. The interface shows the prediction as sealed — present, unread.
3. The player's input is accepted.
4. The seal opens and both are shown together.

The prediction must never be readable before input. It must also never be *computed* after —
that would be trivially cheatable and the code should make it structurally impossible.

### 4.4 The confidence threshold

A deterministic machine is beatable by simulation. Shannon and Hagelbarger both noted this:
forcing the machine to lose requires modelling its state and responding to its history.

The real machines' fix is elegant and is preserved here: **when confidence is low, play
randomly.** That caps the machine at 50% against a perfect opponent while it continues to
exploit an ordinary one. It converts the machine from a deterministic target into a mixed
strategy, which is what game theory says it should be.

The threshold is a user control. At zero, the machine always plays its guess — stronger
against humans, exploitable by anyone who reverse-engineers it. That trade-off should be
felt, not described.

### 4.5 Warm-up

Below a minimum sample the machine plays uniformly at random. This is honest — it has no
basis for a guess — and it is also the app's dramatic structure (§7.1). Do not fake early
confidence.

## 5. Measurement — the portrait

Computed live from the player's sequence.

1. **Win rate**, with a confidence interval that tightens as the session grows. Early leads
   are noise and the interface must not present them as signal.
2. **Switch rate** against 50%. Humans alternate substantially more than chance.
3. **Run-length distribution** against the geometric expectation. In 100 fair flips a run of
   six is near-certain; human sequences rarely contain one. The histogram falling off a
   cliff at length four is the single most damning chart in the app.
4. **Conditional entropy** at orders 1 through 5, in bits per press. This is where the
   predictability actually lives, and it is measurable.
5. **Serial correlation** at lags 1 through 10.
6. **Chi-square on n-gram frequencies**, identifying which specific patterns the player
   overproduces.

### 5.1 Cross-link to Compression Lab

Your keypress sequence has a conditional entropy well below 1 bit per press, which means it
compresses. The portrait states the measured entropy rate and offers the sequence for export
into Compression Lab.

Two apps measuring the same quantity from opposite directions is worth making explicit.

### 5.6 The strategy lab

Named strategies the user is invited to try, each with its result recorded and compared:

- **Alternate strictly** — the machine destroys this within a dozen presses.
- **Copy letters from a book**, odd/even by alphabet position.
- **Digits of pi, mod 2.**
- **A real coin** — the control. The machine drops to 50% and stays there.
- **Deliberately invert your instinct** — which the level-k model is built to catch.

The coin is the important one. It proves the machine is not magic, and it is the only
strategy that works. That a person can win by using a physical object and cannot win using
their own mind is the thesis in one experiment.

## 6. Correctness

### 6.1 Historical fidelity

SEER and MRM must be implemented from:

- C. E. Shannon, *A Mind-Reading (?) Machine*, Bell Laboratories memorandum, 18 March 1953;
  reprinted in *Claude Elwood Shannon: Collected Papers*, IEEE Press, 1993, pp. 688–690.
- D. W. Hagelbarger, *SEER, A SEquence Extrapolating Robot*, IRE Transactions on Electronic
  Computers, EC-5(1), 1956, pp. 1–7.
- Breazu, Volovici, Morariu & Crețulescu, *On Hagelbarger's and Shannon's matching pennies
  playing machines*, 2020, for reimplementation detail.

**The exact state decomposition is to be read off the primary sources, not inferred from
this document.** The description in §2.1 is a summary and is not sufficient to implement
from. If a detail cannot be resolved from the sources, the implementation notes must say so
explicitly rather than guessing silently.

Validation: MRM must beat SEER over a long machine-versus-machine run, reproducing the
documented result. If it does not, one of the two implementations is wrong.

### 6.2 Statistical correctness

- Conditional entropy against a direct independent calculation on known sequences.
- Run-length distribution against the analytic geometric distribution for a fair coin.
- Chi-square against hand-computed values on small fixtures.
- The machine, played against a seeded PRNG for 100,000 rounds, must converge to 50% ± the
  expected sampling error. **This is the most important test in the suite** — if the machine
  beats a real random source, it is broken.

### 6.3 Determinism

Same seed, same input sequence, same parameters produce an identical session. Sessions are
replayable from their export.

## 7. Commitments

### 7.1 The arc is protected

The first twenty presses must feel like nothing is happening. The machine is warming up
(§4.5) and genuinely has no edge.

The experience is: *I am winning* → *why is it winning* → *I cannot stop it*. That arc is
the product, and the interface must not spoil it with a confident-looking readout at press
three or a tutorial that explains the ending.

No onboarding modal. No explanation before play. The explanation is available and is not
pushed.

### 7.2 The seal is real

§4.3 is structural, not cosmetic. The code path must make post-hoc prediction impossible,
and the test suite must include a case asserting the prediction is fixed before input is
read.

### 7.3 The machine does not cheat, and says how

A page explains exactly what the machine sees: the player's press history and nothing else.
Not timing, not cursor position, not which side of the screen was tapped. If a future version
uses reaction time, that must be disclosed prominently, because reaction time is a genuinely
strong signal and using it silently would be a betrayal of the app's premise.

v1 uses press history only.

### 7.4 Uncertainty is shown

A 60% win rate over 20 presses is noise. The interface shows confidence intervals and does
not let the player draw conclusions the sample cannot support.

### 7.5 Nothing leaves the device

No network at runtime. No analytics. Sessions export by explicit user action only.

## 8. Acceptance criteria

1. Machine against a seeded PRNG over 100,000 rounds converges to 50% within sampling error.
   Runs in CI, blocks deploy.
2. MRM beats SEER over a long machine-versus-machine run.
3. All statistical tests in §6.2 pass.
4. The seal test: prediction is provably fixed before input is read.
5. Input-to-reveal latency under 80 ms. The game must feel immediate or nobody plays long
   enough to lose.
6. Playable one-handed on a phone: two tap targets, each at least 44 px, reachable by thumb.
7. `prefers-reduced-motion` honoured: the seal opens without animation, the boundary moves
   without transition.
8. Fully keyboard operable — arrow keys, and space to reveal.
9. Every chart has a keyboard-reachable table equivalent. Session exports as JSON and CSV.
10. Zero runtime network requests.
11. Bundle under 150 KB gzipped.
12. Works at 380 px. This is a phone app first.
