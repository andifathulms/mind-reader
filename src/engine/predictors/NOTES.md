# Implementation notes — the reconstructions

This file is shipped with the app and linked from the Archive view.

SEER and MRM are reconstructions of two relay machines built at Bell Laboratories in the
1950s. Both are implemented from the primary sources rather than from a modern summary. Where
the sources do not settle a detail, the assumption is recorded here rather than guessed at
silently. An honest note about an unresolved detail is worth more than a confident guess, and
these seams are part of the artifact.

## Sources

- C. E. Shannon, *A Mind-Reading (?) Machine*, Bell Laboratories memorandum, 18 March 1953.
  Reprinted in *Claude Elwood Shannon: Collected Papers*, IEEE Press, 1993, pp. 688–690.
- D. W. Hagelbarger, *SEER, A SEquence Extrapolating Robot*, IRE Transactions on Electronic
  Computers, EC-5(1), March 1956, pp. 1–7.
- M. Breazu, D. Volovici, D. Morariu & R. G. Crețulescu, *On Hagelbarger's and Shannon's
  matching pennies playing machines*, International Journal of Advanced Statistics and IT&C
  for Economics and Life Sciences, X(1), December 2020. DOI 10.2478/ijasitels-2020-0003.

The 2020 paper quotes both machines' descriptions at length and reimplements them; the
quotations below are Hagelbarger's and Shannon's own words as reproduced there.

## What the sources do settle

**The state of play**, shared by both machines. Three facts, in the order they occur in time:

- whether it won or lost the play before last (W/L)
- whether it played the same or differently last time (S/D)
- whether it won or lost the last play (W/L)

Eight states, WSW through LDL. SEER computes all three from its own play. MRM computes them
from the opponent's — that is the substantive difference between the two machines, and it is
what Shannon's title is pointing at.

**SEER's memory**, two things per state:

> a) Should the machine play same or different in this state in order to win?
> b) Has the machine been winning in this state?

> The a) part of the memory state is controlled by a reversible counter which starts at zero
> and can count up to +3 and down to −3. At the end of each play, if the machine should have
> played same, one is added to the counter. If it should have played different, one is
> subtracted. […] The stops at +3 and −3 in effect make the machine forget ancient history.

The b) part remembers "whether the machine has won both, one, or neither of the last two
plays in that state".

**SEER's play rules**, quoted in full:

> If the machine has lost the last two times in the present state, it plays randomly with
> equal odds on same and different.
>
> If the machine has won one of the last two times in this state, it has three-to-one odds
> that it will follow the instruction in the a) part of the state memory.
>
> If the machine has won both of the last two times in this state, the machine must follow
> the instruction in the a) part of the state memory.

**MRM's memory**, one thing per state: what the opponent did the last two times the state
arose, played the same or played differently. Where both agree, the machine takes it as the
player's habit in that situation and plays to it. Where they disagree, it plays randomly.
MRM drops SEER's eight reversible counters entirely, which is how Hagelbarger's remark that
Shannon "has built a machine using about half as many relays" comes out true.

## What the sources do not settle

**1. SEER's counter at exactly zero.** The counter starts at zero and holds "the number of
times the machine should have played same in that state minus the number of times it should
have played different". At zero it contains no instruction, and no rule is given for that
case.

*Assumed:* the machine plays randomly with equal odds, the same as when it has lost the last
two times in that state. The alternative — treating zero as "play same" — would give a fresh
machine a systematic bias it has no evidence for, and both papers are careful that the
machine is honest about having no basis.

**2. MRM's change-history register when the state has not arisen twice yet.** The register is
cleared at the start, and a cleared register reads as "the opponent played the same both
times", which is an instruction the machine has no evidence for.

*Assumed:* the register is followed as the source describes, including from a cleared state.
A relay machine's registers were cleared to zero and it had no separate "not yet seen" bit to
spend relays on, so this is very likely the behaviour of the machine as built. It makes MRM
open a session by assuming the player repeats, which is a real bias for the first handful of
plays in each state and disappears within a dozen. This app's warm-up (PRD §4.5) covers that
stretch anyway.

**3. The first two plays.** Neither machine can form a state before two plays have happened.

*Assumed:* random with equal odds until there are two.

**4. Which machine the umpire turned around.** Both machines were built to match, so one of
the pair has to be presented with the inverse of the other's moves for the game to exist at
all. The sources do not record which. `historical.test.ts` plays both assignments and
averages, and MRM finishes ahead either way.

**5. The exact numeric labelling of the eight states.** Irrelevant to behaviour — only
consistency matters — but recorded because a reader comparing this code to the 1956 block
diagram will find a different ordering. The index used here is
`won(n−1) · 4 + changed(n) · 2 + won(n)`, matching the worked example in the 2020 paper.

## Result

Hagelbarger recorded that the two machines were connected by an umpire and played several
thousand games: "The agility of the small machine triumphed, and it beat the larger one about
55-45." The 2020 reimplementation measured 55.8–44.2 over 100-play games.

These reconstructions produce **MRM 57.9 — SEER 42.1**, averaged over both umpire roles and
twenty seeds, and the figure is stable from 100 plays through 10,000. That is a little wider
than either published result, which is what should be expected given the four assumptions
above, and it reproduces the direction and the rough size of a result from 1953.

## The other three predictors

N-gram, backoff and level-k are modern constructions with no single primary source, and they
are marked as such in the interface. They are not reconstructions of anything and should not
be read as historical.
