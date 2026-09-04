import { createMachine } from '../engine';
import type { Machine } from '../engine';
import type { Config, Move, Round, Session } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/types';
import { seedFrom } from '../engine/rng';
import type { SealedPrediction } from '../engine/referee';
import type { MixerState } from '../engine/mixer';

export interface Reveal {
  round: Round;
  /** Increments on every press, so the arena can key its reveal animation. */
  token: number;
}

/**
 * The session store.
 *
 * Two subscription channels, because the arena and the analysis have different
 * update rates and must not share a render tree (CLAUDE.md §7). The arena
 * subscribes to `subscribe` and updates on the press. The chart panels
 * subscribe to `subscribeSlow` and update on a throttle, so a fast player never
 * waits on six charts re-rendering between their press and the reveal.
 */
export class GameStore {
  private machine: Machine;
  private fast = new Set<() => void>();
  private slow = new Set<() => void>();
  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  version = 0;
  slowVersion = 0;
  reveal: Reveal | null = null;

  constructor(
    private config: Config = DEFAULT_CONFIG,
    private seed: number = seedFrom(0),
    private readonly throttleMs = 120,
  ) {
    this.machine = createMachine(config, seed, () => 0);
    // The first seal exists before the interface does, so the very first press
    // has nothing to wait for.
    this.machine.referee.seal();
  }

  subscribe = (fn: () => void): (() => void) => {
    this.fast.add(fn);
    return () => this.fast.delete(fn);
  };

  subscribeSlow = (fn: () => void): (() => void) => {
    this.slow.add(fn);
    return () => this.slow.delete(fn);
  };

  getVersion = (): number => this.version;
  getSlowVersion = (): number => this.slowVersion;

  get seal(): SealedPrediction | null {
    return this.machine.referee.currentSeal;
  }

  get rounds(): readonly Round[] {
    return this.machine.referee.getRounds();
  }

  get history(): readonly Move[] {
    return this.machine.referee.getHistory();
  }

  get weights(): MixerState {
    return this.machine.weights();
  }

  get currentConfig(): Config {
    return this.config;
  }

  get currentSeed(): number {
    return this.seed;
  }

  session(): Session {
    return this.machine.session();
  }

  /**
   * Resolve the open seal against the press, then seal the next round at once.
   * Sealing immediately means the machine is never computing while the player
   * is waiting (CLAUDE.md §7).
   */
  press(move: Move): Round | null {
    const seal = this.machine.referee.currentSeal;
    if (!seal) return null;
    const round = this.machine.referee.resolve(seal, move);
    this.reveal = { round, token: round.index + 1 };
    this.machine.referee.seal();
    this.emit();
    return round;
  }

  reconfigure(config: Config, seed: number = this.seed): void {
    this.config = config;
    this.seed = seed;
    this.machine = createMachine(config, seed, () => 0);
    this.machine.referee.seal();
    this.reveal = null;
    this.emit(true);
  }

  restart(seed: number = this.seed): void {
    this.reconfigure(this.config, seed);
  }

  private emit(immediateSlow = false): void {
    this.version += 1;
    for (const fn of this.fast) fn();

    if (immediateSlow) {
      if (this.slowTimer) clearTimeout(this.slowTimer);
      this.slowTimer = null;
      this.flushSlow();
      return;
    }
    if (this.slowTimer) return;
    this.slowTimer = setTimeout(() => {
      this.slowTimer = null;
      this.flushSlow();
    }, this.throttleMs);
  }

  private flushSlow(): void {
    this.slowVersion += 1;
    for (const fn of this.slow) fn();
  }
}
