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
