# Mind reader

Matching pennies against a machine that predicts your next press.

The optimal strategy is provably a fair coin. Play it and you tie at 50% forever. The machine
cannot beat a correct player — it wins because you cannot execute a strategy you already know.

Five predictors run against you at once, including reconstructions of Hagelbarger's SEER
(1956) and Shannon's MRM (1953). The mixture makes the actual move, and every prediction is
sealed before your input is read.

## Running it

```
npm install
npm run dev
```

## Checks

```
npm run typecheck
npm run lint
npm test
```

`tests/fairness.test.ts` plays the machine against a seeded PRNG for 100,000 rounds and
asserts it converges to 50%. If that test fails the machine is cheating — see CLAUDE.md §5.

## What the machine sees

The player's press history and nothing else. No timing, no coordinates, no tap position.
Nothing leaves the device; there are no network requests at runtime.

## What is here

- `src/engine/` — the machines. Pure: no React, no DOM, no clock except an injected one.
  `referee.ts` is the commitment protocol, `predictors/` the five models, `umpire.ts` the box
  Shannon and Hagelbarger put between their two machines.
- `src/engine/predictors/NOTES.md` — what the 1950s papers do not settle, and what was assumed
  instead. Printed in full in the Archive view.
- `src/stats/` — the six measurements, each checked against an independent calculation.
- `src/views/` — the arena, the ensemble, the portrait, the strategy lab, the rematch, the
  archive.

## The gates

Two tests block a deploy.

`tests/fairness.test.ts` plays the machine against a seeded PRNG for 100,000 rounds and asserts
it converges to 50%. A machine that beats a coin is predicting a random sequence, which is a
contradiction — the bug is the future leaking into the prediction, and the same bug inflates
the score against people. **Do not tune this test until it passes** (CLAUDE.md §5).

`tests/historical.test.ts` runs MRM against SEER through the umpire and asserts MRM finishes
ahead, reproducing the result Hagelbarger recorded in 1956. If it does not, one of the two
reconstructions is wrong.

## Deployment

GitHub Pages via Actions: typecheck, lint, test, build, bundle budget, then deploy — only on
green. The site is served from `/mind-reader/`; set `BASE_PATH` to host it elsewhere.
