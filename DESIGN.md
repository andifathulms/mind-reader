# DESIGN.md — Mind Reader

Visual and motion specification. PRD.md defines substance; this defines form.

---

## 0. The design problem

Every other app in this family has one subject and one reader. This one has **two parties**,
and they are opponents.

That is the structural fact the design has to carry, and it suggests something none of the
other apps could use: the screen does not have one ground. It has two.

**The player's side is light. The machine's side is dark. The boundary between them moves
with the score.**

At the start it sits dead centre — nobody is ahead, and the machine is honestly playing at
random. As the machine pulls ahead the dark encroaches, continuously, press by press. You
watch yourself losing territory.

That gives the app an ambient score requiring no number, a structure that states the
adversarial relationship without a word of copy, and a single continuous quantity that is
worth animating. It is also the only honest way to show a result that is statistically noisy
early: the boundary drifts and jitters around centre for the first stretch, which is exactly
what a 50% process looks like, and then it commits.

Everything else in the design defers to keeping that legible.

**Second constraint: the game must feel immediate.** Under 80 ms from press to reveal
(PRD §8.5). A person who does not enjoy the loop stops before the machine warms up, and the
warm-up is the product. Speed is a design requirement, not an engineering footnote.

---

## 1. Design plan

**Concept: two territories and a sealed envelope.**

A contested boundary, and at each round one small object crossing it — the machine's
prediction, sealed before your move and opened after. The seal is the trust mechanism made
visible: you can see there is something there, and you can see it is closed.

The register is mid-century laboratory rather than arcade. Shannon's device was a relay
machine at Bell Labs in 1953, not a game console. Nothing pulses, nothing celebrates,
nothing taunts. The machine reports, and its silence is what makes it unsettling.

**Alignment:** the arena is symmetrical about the boundary because the game is symmetrical.
The analysis below it is left-aligned prose and right-aligned figures, like a lab notebook.

---

## 2. Colour

### 2.1 The two territories

| Token | Value | Use |
|---|---|---|
| `--yours` | `#EEEBE4` | The player's ground. Warm off-white, paper. |
| `--yours-ink` | `#15130F` | Text and marks on the player's side. 16.9:1. |
| `--machine` | `#0B0E13` | The machine's ground. Relay black, cool and a little blue. |
| `--machine-ink` | `#E6EAF0` | Text and marks on the machine's side. 16.2:1. |
| `--boundary` | `#9097A0` | The dividing line itself. 2 px, neutral, belonging to neither. |

Warm light against cool dark. The temperature difference does as much work as the value
difference and it makes the two sides feel like different materials rather than an inverted
theme.

The analysis section below the arena sits on `--yours`, because it is the player's record of
what happened to them.

### 2.2 One colour per side

| Token | Value | Use |
|---|---|---|
| `--amber` / `--amber-deep` | `#FF7A2F` / `#D4581A` | The machine. A round it won, its trail, its seal's lock. |
| `--cobalt` / `--cobalt-lit` | `#2A4FD6` / `#6F8CFF` | The player. A round you won, links, your accents. |
| `--random` | `#7A8089` | The machine played randomly — warm-up or low confidence. Neutral. |

`--hit` and `--miss` resolve to the bright form on the machine's ground and the deep form on
the player's, so a mark clears 3:1 wherever the boundary puts it.

Earlier versions used a win-red and a loss-green. Under deuteranopia those two collapse into
olive greys and the tape — the round-by-round record — becomes one colour. Amber and cobalt
stay apart under every common colour-vision type, and giving each side its own colour states
the rivalry before a word is read.

The neutral for random rounds matters. Those rounds are not a contest and marking them as
wins or losses would misrepresent the machine's claim. A stretch of grey marks during warm-up
tells the truth: nothing is happening yet.

### 2.3 The eight predictors

Only used on the machine's dark ground, so the set is tuned for dark.

| Predictor | Colour | Era |
|---|---|---|
| SEER | `#E08A4E` | 1950s |
| MRM | `#E3BC3A` | 1950s |
| N-gram | `#5DB3D3` | classic |
| Backoff | `#9C8AE0` | classic |
| Level-k | `#6CC486` | classic |
| Context mix | `#E36FA8` | modern |
| Run length | `#B7C4D4` | modern |
| Reaction | `#F2E3C6` | modern |

SEER and MRM sit adjacent in hue because they are historically adjacent — one is a
simplification of the other — and their weights are worth comparing directly.

### 2.4 Restraint

Nothing else is coloured. No hover tints. No selection blue. No success green outside
`--miss`. Selection is a 2 px outline in the local ink.

The chart in the portrait that matters most — run lengths against the geometric expectation —
uses ink for measured and a hairline for expected, no colour at all. It does not need any.

---

## 3. Typography

Three faces with three jobs, all bundled — there is no network at runtime.

**Archivo**, stretched wide, for the scores and the headings. A grotesque with a width axis:
at 125% its numerals read as readouts on a panel rather than as text, which makes the score
the most memorable thing on the screen. The same face condensed sets the labels, so a label
can go up a size without getting longer. Shipped cut down to width 62–125 and weight 600–900.

**Geist** for everything read as prose or interface.

**Geist Mono** for every live number that is not a score: rates, intervals, round counts, the
ledger. Fixed-width digits, so nothing shifts as they change.

**Courier Prime** in the Archive view only. Shannon's memorandum was a typescript. So was
Hagelbarger's paper. Setting the reconstructed historical material in a well-drawn Courier is
a quotation of a document form, not a costume — and it is confined to one view, which is what
keeps it from being a gimmick. If it appears outside the Archive, delete it.

### 3.1 Scale

| Token | Face | Use |
|---|---|---|
| `--t-score` | Archivo 900, expanded, 64–120 px | The two scores in the arena |
| `--t-display` | Archivo 850, semi-expanded, 32–58 px | Section titles, portrait figures |
| `--t-title` / `--t-figure` | Archivo 800, semi-expanded, 22–30 px | Sub-headings, chart values |
| `--t-h2` | Geist 620, 17 px | Panel headings |
| `--t-body` | Geist 400, 16–17 px / 1.62 | Copy. Max 66 characters. |
| `--t-note` | Geist 430, 14 px / 1.5 | Quiet sentences |
| `--t-data` | Geist 450, 13.5 px | Tables |
| `--t-readout` | Geist Mono 500, 13 px | Live numbers |
| `--t-micro` | Geist Mono 520, 11.5 px, caps, +0.08em | Labels that name things |
| `--t-archive` | Courier Prime 14 px / 1.7 | Archive view only |

`font-variant-numeric: tabular-nums` throughout. The score changes every press and must not
shift width.

### 3.2 Prohibitions

No italic for emphasis in the interface. Sentence case in every sentence. Capitals are for
labels that name a thing — `you`, `machine`, `confidence threshold` — and nothing that reads
as a sentence.

The score is large and that is the app's only typographic drama. It does not need a second.

---

## 4. Layout

### 4.1 The arena

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   YOU                                            │  --yours
│   47                                             │
│                                                  │
│              ▪▪▫▪▪▪▫▪▫▪▪▪▪  ← round marks        │
│  ────────────────────────┬───────────────────    │  boundary, moves
│                          │                       │
│                        [ ▣ ]  ← the seal         │
│                                                  │
│                                        MACHINE   │  --machine
│                                             68   │
│                                                  │
│         ┌──────────┐    ┌──────────┐             │
│         │   LEFT   │    │  RIGHT   │             │
│         └──────────┘    └──────────┘             │
└──────────────────────────────────────────────────┘
```

The boundary is horizontal and its vertical position is the score. The player's territory is
above, the machine's below — which puts the machine underneath, pressing up, and puts the
tap targets in thumb reach at the bottom.

The seal sits **on** the boundary, because it belongs to neither side until it opens.

Round marks run as a strip just above the boundary, oldest scrolling off the left. Hits sit
below the line in the machine's colour, misses above in the player's, random rounds on the
line in neutral.

The head (name, premise, a warm-up chip and a round chip) and the player's score share one
column in normal flow at the top; the machine's score, its readout and the keys share another
anchored to the bottom. However the head wraps, nothing lands on anything else. The boundary's
stops are measured from the two numerals, so the line comes to rest short of a score rather
than running through it.

The warm-up chip — `Warm-up · 7 of 12` — is true information: the machine is playing a fair
coin and says so. It tells a player the first dozen rounds are not the game yet, without
saying what the game will be.

The explanation of the boundary's shrinkage sits one tap away (`Why the line is at 83%`), not
beside the score while the player is trying to play.

### 4.2 The keys

Two, side by side, at the bottom. 70–76 px tall — generous enough for a thumb without looking.

They are keys, not outlines: a dark cap with a lit top edge, a 4 px travel, and a keycap hint
for the arrow key on devices that have one. They always sit on the machine's ground, so they
are drawn in its colours in both layers.

Labelled `Left` and `Right`, not `heads` and `tails`, because the arrow keys map to them on
desktop and the mapping should be obvious.

They do not change appearance based on prediction. Ever. The seal is the only thing that
knows.

### 4.3 Below the arena

The analysis is a set of views behind one sticky tab bar, not one long scroll: Seal ·
Ensemble · Settings · Portrait · Lab · Rematch · Archive · Export. The bar is the machine's
chrome — relay black with a paper pill sliding under the chosen view — and it stays at the
top while a view is read. Choosing a view brings you to its top. Arrow keys move between tabs
while one has focus; everywhere else they still play.

Views that are not showing stay mounted, so a running rematch keeps running and a lab result
is still there on return. On paper every view prints. The active view is not in the URL: the
hash carries the machine's configuration, and which page of the analysis you were reading is
not part of a session anyone would share.

Each view opens with its heading and its main figures; derivations sit behind a disclosure.

### 4.4 Grid and rhythm

8 px base. Spacing scale: 8 · 16 · 24 · 40 · 64. Max width 74 rem below the arena; the arena
itself is full-bleed.

Figures are **surfaces**: the local ground raised one step, a 1 px hairline edge in the local
ink, and a 14 px radius. Surfaces are how a view is broken into things to read. Nothing below
the arena casts a shadow; the arena's keys and seal are the only objects that do, because they
are the only objects with depth.

Buttons are one system with two weights: a filled primary for the one thing a view asks you
to do, and a quiet secondary for the rest. 40 px tall, 10 px radius, local ink.

### 4.5 Mobile

This is the target platform. The arena fills the viewport on load, with the analysis below
the fold — deliberately, so the first experience is playing rather than reading.

Everything below the arena stacks to one column. The ensemble's eight weights become a
horizontal stacked bar rather than five tracks. The rematch runs at reduced speed so the
machine-versus-machine exchange stays legible on a small screen.

---

## 5. Instruments

### 5.1 The seal

A rounded square on the boundary, 68–88 px. Closed, it is two dark hatched halves with the
machine's amber lamp lit at the centre — something is in there and you cannot see it. It is
drawn in fixed colours, not the local ink, because it is one object straddling both grounds.

On reveal the halves draw apart and the lamp goes out, showing the committed move as an arrow
with `sealed` or `random` under it. The round then lands on the tape as a mark.

The seal must read as closed at a glance and its opening must be fast (§6.2). It carries the
app's entire trust claim and it does so without a word of explanation.

### 5.2 Ensemble

Eight horizontal tracks on the machine's ground, one per predictor, grouped by era — the
relay machines, the classic models, the modern ones — so a reconstruction is never read as a
modern model, each showing its current
weight as a filled bar.

Each track also shows what that predictor guessed this round and whether it was right — so a
user can watch a model that is currently unweighted nonetheless being correct, and watch its
weight climb over the following rounds.

When a player changes strategy, the weights redistribute over a dozen or so presses. That
redistribution is the app's most interesting sustained visual and it should be given room.

### 5.3 Portrait

Six measurements, in this order:

1. **Win rate** with a Wilson interval, drawn as a bar with the interval as a lighter span
   around it. Early on, that span is enormous — which is the point.
2. **Run lengths**, measured bars against the geometric expectation as a hairline curve.
   The measured bars falling off a cliff at length four is the app's most damning chart and
   it gets the most space.
3. **Switch rate**, one figure against 50%, drawn as a single deviation.
4. **Conditional entropy** at orders 1 to 5, descending, in bits per press. Same staircase
   shape as Compression Lab, deliberately — a reader who has seen one recognises the other.
5. **Serial correlation** at lags 1 to 10, a small stem plot.
6. **N-gram chi-square**, showing which specific patterns are overproduced, as a ranked list
   rather than a chart.

Every figure carries its uncertainty. None is presented as a conclusion before the sample
supports it.

### 5.4 Strategy lab

Each named strategy as a row: what to do, your result when you tried it, the machine's win
rate against it.

The coin row is marked distinctly and sits last, because it is the only one that works, and
finding that out after failing at five mental strategies is the correct order to learn it.

### 5.5 Rematch

Two machines facing each other across the same boundary, the umpire between them. Runs at
speed with a running score and a live boundary of its own.

The boundary drifting steadily toward SEER's side, over thousands of rounds, is the
reproduction of a result from 1953 happening in front of you.

### 5.6 Archive

Courier Prime, on a slightly warmer paper than the rest of the light side. Shannon's and
Hagelbarger's machines described as built, with the sources cited fully and the
implementation notes — including anything that could not be resolved from the papers —
linked directly.

The unresolved details are not a weakness to hide. They are the reconstruction's honest
seams, and showing them is what makes the rest credible.

---

## 6. Motion

### 6.1 What moves

Two things carry the game. Everything else is the surrounding choreography, and it is held to
a rule: nothing that moves may report anything the readouts do not already report.

**The boundary** tracks the running win rate continuously, no easing. It is a readout, not a
transition, and it should drift and jitter early exactly as a noisy statistic does. Behind it
the boundary's own past is drawn as a trail, on the same scale, so a rate can be seen to have
been climbed to rather than fallen from. The trail is the same quantity over time; it is not a
projection and nothing about it is smoothed.

**The seal** opens on reveal.

**The beat.** One pulse runs the width of the boundary on reveal, in the colour of the mark
just laid. It is the only concession in §6.4 and it is a deliberate one: it carries nothing
the marks and the scores do not already carry, it is the same on a win as on a loss, and it is
gone in 380 ms.

**Arrival.** Everything below the arena rises and fades in as it is scrolled into, once,
through one shared observer. Bars grow from their own feet, traces wipe in left to right in
the direction the session was played. A reveal is a flourish; nothing depends on one to become
visible, and an element whose observer never fires is shown immediately.

**The press.** The key travels 3 px for 110 ms, in both layers at once; on a phone an 8 ms
haptic tick lands with it. The score that changed rolls up in 170 ms. All three are the same on
a win as on a loss: they say a press landed and a number went up, nothing about whose.

**The arena's opening**, played once on load, staggered over 600 ms. The surface is
interactive from the first frame: a press during the entrance is played, not swallowed.

### 6.2 Durations

| Event | Duration | Curve |
|---|---|---|
| Seal opening | 120 ms | `cubic-bezier(.4,0,.2,1)` |
| Move flying to its side | 180 ms, overlapping the seal | `cubic-bezier(.32,.72,0,1)` |
| Key travel | 70 ms down, held 110 ms | `cubic-bezier(.16,1,.3,1)` |
| Score roll | 170 ms | `cubic-bezier(.16,1,.3,1)` |
| Boundary pulse | 380 ms | `cubic-bezier(.16,1,.3,1)` |
| Boundary | continuous, no duration | — |
| Ensemble weight change | 400 ms | `cubic-bezier(.32,.72,0,1)` |
| Section reveal on scroll | 620 ms, staggered ≤ 6 × 55 ms | `cubic-bezier(.16,1,.3,1)` |
| A chart drawing itself | 900 ms | `cubic-bezier(.16,1,.3,1)` |

Total press-to-resolution is under 300 ms of animation and under 80 ms to the first visible
response. The next round's seal is already prepared (CLAUDE.md §7), so there is never a wait.
Nothing in the arrival choreography touches the press path.

### 6.3 The orchestrated moment: the crossing

Not authored. It happens, and the design's job is to be ready for it.

For the first twenty presses the machine plays at random and the boundary hovers near centre,
drifting. Round marks are mostly neutral. Nothing is happening, honestly.

Then the machine starts committing. Hits accumulate. The boundary crosses centre and, for the
first time, stays across.

**Do not announce this.** No flash, no sound, no "the machine is now predicting you" banner.
The boundary crossing and holding is the announcement, and a player who is paying attention
will feel it land. One that is not will feel it thirty presses later, which is also fine.

The only concession: the round marks stop being neutral, which is a truthful signal that the
machine has begun to claim its guesses rather than a dramatic effect.

### 6.4 Restraint

No celebration. No taunt. No shake, no particle, no sound. The haptic tick is not a sound: it
is the key's travel felt through the glass, and it is identical on every press. The machine reports its score and
says nothing else, and that silence is the app's register (CLAUDE.md §10).

The one pulse in §6.1 is the single exception. The test it has to pass, and the test anything
proposed after it has to pass: does it say something the score does not, and does it say
something different when the player wins? The pulse fails both, which is why it is allowed. A
flash that appeared only on a machine win would be a taunt with the sound turned off.

### 6.5 Reduced motion

`prefers-reduced-motion: reduce`: the seal opens with no transition, the move appears at its
destination rather than travelling, the boundary jumps rather than slides, ensemble weights
snap. Every arrival lands at its final state before the first frame rather than animating to
it, and no chart draws itself. Nothing is lost — the game is unaffected, and every figure is
present and complete, which is the correct outcome for an app whose core loop is a single
binary choice.

This is one token, not a second stylesheet. `--still` is 0 normally and 1 under the query, and
every decorative animation is written so that a `--still` of 1 multiplies it out of existence.
A motion rule that has to be remembered twice will eventually be remembered once.

---

## 7. Copy

English, sentence case, no exclamation marks. Fewer words than any other app in the family.

The machine never comments on performance. It reports. `68% over 140 rounds (95% CI:
60–75%)` and nothing more.

Precise verbs: the machine *predicts*, it does not *read*. Shannon's question mark from
*A Mind-Reading (?) Machine* appears once, in the header, unexplained until the archive.

No onboarding. No modal. No tutorial. The app opens with the arena and two targets, and the
only instruction is the two labels. Everything else is available below and is never pushed
(PRD §7.1).

The disclosure of what the machine can see (PRD §7.3) sits at the top of the archive, in
plain language: press history, nothing else. Not timing, not where on the button you tapped.

---

## 8. Quality floor

Assumed, not announced: one-handed on a phone; targets comfortably above 44 px; visible
keyboard focus; arrow keys and space fully operable; every chart has a table equivalent;
session exports as JSON and CSV; contrast 4.5:1 for text on both grounds; reduced motion
honoured; no network at runtime.

## 9. Relationship to the house layer

Takes: the spacing scale, the motion curve family, the citation-popover pattern, the type
floor, the continuous-versus-discrete motion rule.

Contributes back:

**The score as territory.** A continuous quantity rendered as a moving boundary between two
grounds, rather than as a number. It states the relationship and the value at once, and it
represents statistical noise honestly — a jittering boundary is what a noisy estimate looks
like, which a printed percentage conceals.

**Silence as register.** An app that reports and does not comment. Worth having in the house
layer as an option, because the reflex in interactive work is to congratulate the user and
here that reflex would destroy the product.

Departs in one place: this is the only app in the family with two grounds in one view that
are *opposed* rather than complementary. Mixed Traffic Simulator has a dark road and paper
instruments, but those are a phenomenon and its record. Here they are two players. Keep the
distinction — the pattern is not the same one twice.
