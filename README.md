<div align="center">

<img src="public/og.png" alt="Mind reader (?). The optimal move is known, published, and simple. You still cannot make it." width="720">

<br>

**[Play it](https://andifathulms.github.io/mind-reader/)**&nbsp; ·&nbsp; **[What it is](https://andifathulms.github.io/mind-reader/landing.html)**

[![CI](https://github.com/andifathulms/mind-reader/actions/workflows/ci.yml/badge.svg)](https://github.com/andifathulms/mind-reader/actions/workflows/ci.yml)

</div>

---

Matching pennies against a machine that predicts your next press.

The optimal strategy is provably a fair coin. Play it and you tie at 50% forever, against
anyone. So the machine cannot beat a correct player. It wins because you cannot execute a
strategy you already know, and the counter-strategy is published and simple too.

That gap is the app.

Eight predictors run against you at once, two of them reconstructions of real machines:
Hagelbarger's **SEER** (Bell Labs, 1956) and Shannon's **MRM** (1953). A mixer weights them by
how right each has recently been, and the mixture makes the actual move. Every prediction is
sealed before your input is read, and the app will re-seal your whole session in front of you
to prove it.

## What the machine sees

Your press history, and the moves it has already shown you. Nothing else.

No timing, no coordinates, no tap position, no reaction time. That is not a convention, it is
the type signature: `predict(history: readonly Move[], own: readonly Move[])` has nowhere to
pass anything else. The machine's own past moves are there so one model can see whether you
just won or lost; each was revealed to you when its seal opened, and the move sealed for the
current round is never an input.
Nothing leaves the device, there are no network requests at runtime, and there is no analytics.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173/mind-reader/
```

| | |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint |
| `npm test` | Vitest, 72 tests |
| `npm run build` | typecheck → bundle |

## The gates

Two tests block a deploy, and neither is a formality.

**`tests/fairness.test.ts`** plays the machine against a seeded PRNG for 100,000 rounds and
asserts it converges to 50%. A machine that beats a coin is predicting a random sequence,
which is a contradiction: the bug is the future leaking into the prediction, and the same bug
silently inflates the score against people. **Do not tune this test until it passes.**

**`tests/historical.test.ts`** runs MRM against SEER through the umpire and asserts MRM
finishes ahead, reproducing what Hagelbarger recorded in 1956. If it does not, one of the two
reconstructions is wrong.

## Layout

```
src/
├─ engine/          the machines. Pure: no React, no DOM, no clock but an injected one
│  ├─ referee.ts      the commitment protocol
│  ├─ mixer.ts        weighting, confidence, the random fallback
│  ├─ verify.ts       re-seals a session to show each prediction predates its press
│  ├─ umpire.ts       the box Shannon and Hagelbarger put between their two machines
│  └─ predictors/     the eight models, and NOTES.md on what the papers do not settle
├─ stats/           six measurements, each checked against an independent calculation
├─ views/           arena · seal · ensemble · settings · portrait · lab · rematch · archive
└─ meta.ts          every route's title and description, and the page copy they come from
```

Zero runtime dependencies beyond React. The whole thing is 92 kB gzipped against a 150 kB
budget that CI enforces.

## Reading the source

- **[PRD.md](PRD.md)** — what it is and why, including the commitments it is held to.
- **[DESIGN.md](DESIGN.md)** — two grounds, a moving boundary, and a sealed envelope.
- **[CLAUDE.md](CLAUDE.md)** — the build rules. §1–6 are the non-negotiables.
- **[src/engine/predictors/NOTES.md](src/engine/predictors/NOTES.md)** — every detail the 1953
  and 1956 sources leave unresolved, and what was assumed instead. Shipped with the app and
  printed in full in the Archive, because the reconstruction's uncertainties are part of the
  artifact.

## Sources

- C. E. Shannon, *A Mind-Reading (?) Machine*, Bell Laboratories memorandum, 18 March 1953.
- D. W. Hagelbarger, *SEER, A SEquence Extrapolating Robot*, IRE Transactions on Electronic
  Computers, EC-5(1), 1956.

The question mark in the title is Shannon's. The machine is not reading anything; it is
exploiting a failure.

## Deployment

GitHub Pages via Actions: typecheck → lint → test → build → bundle budget → deploy, only on
green. Served from `/mind-reader/`; set `BASE_PATH` to host it elsewhere, and `SITE_ORIGIN` to
point canonical and Open Graph URLs somewhere else.
