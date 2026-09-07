import { createMachine } from './index';
import type { Config, Move, Round, Session } from './types';

/**
 * One round, re-sealed from a machine that has not seen the press it predicts.
 */
export interface SealCheck {
  index: number;
  /** How many presses existed when this prediction was committed. */
  historyLength: number;
  /** What the session recorded as sealed. */
  recorded: Move;
  /** What a fresh machine, fed only the earlier presses, commits to now. */
  recomputed: Move;
  matches: boolean;
  /** The press that arrived after the seal was shut. */
  actual: Move;
}

export interface SealAudit {
  checks: SealCheck[];
  allMatch: boolean;
  /** The first round that failed, if any. */
  firstMismatch: number | null;
}

/**
 * The commitment protocol, checked rather than claimed.
 *
 * PRD §4.3 makes this the app's load-bearing promise: the prediction is fixed
 * before the press is read, and the score means nothing to a reader who does
 * not believe that. The promise is enforced in the referee's types and in
 * commitment.test.ts, and a player sees neither. What they see is a closed
 * envelope and a sentence, which is exactly what an app that was cheating
 * would also show them.
 *
 * This is the demonstration instead of the assurance. A new machine is built
 * from the session's own seed and configuration and walked forward through the
 * recorded presses. At each round it is asked to seal before it is told what
 * happened next, and its commitment is compared with the one on record. Round
 * 40's prediction is reproduced by a machine that has seen 39 presses, which is
 * only possible if press 40 was never an input to it.
 *
 * It cannot prove the original was not computed some other way. Nothing running
 * inside the same program could. What it does show is that every recorded
 * prediction is a function of the presses that preceded it and of nothing else,
 * which is the property the claim actually rests on.
 */
export function verifySeals(
  rounds: readonly Round[],
  config: Config,
  seed: number,
  limit = Number.POSITIVE_INFINITY,
): SealAudit {
  const machine = createMachine(config, seed);
  const checks: SealCheck[] = [];
  let firstMismatch: number | null = null;

  const count = Math.min(rounds.length, limit);
  for (let i = 0; i < count; i += 1) {
    const round = rounds[i];
    if (!round) break;
    const seal = machine.referee.seal();
    const matches = seal.commit === round.prediction;
    if (!matches && firstMismatch === null) firstMismatch = i;
    checks.push({
      index: round.index,
      historyLength: seal.historyLength,
      recorded: round.prediction,
      recomputed: seal.commit,
      matches,
      actual: round.actual,
    });
    // Only now is the machine told what the player did.
    machine.referee.resolve(seal, round.actual);
  }

  return { checks, allMatch: firstMismatch === null, firstMismatch };
}

/** Convenience for an exported session. */
export function verifySession(session: Session, limit?: number): SealAudit {
  return verifySeals(session.rounds, session.config, session.seed, limit);
}
