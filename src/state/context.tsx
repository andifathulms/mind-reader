import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { GameStore } from './store';
import type { Config } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/types';

const StoreContext = createContext<GameStore | null>(null);

export function StoreProvider({
  children,
  config = DEFAULT_CONFIG,
  seed,
}: {
  children: ReactNode;
  config?: Config;
  seed: number;
}) {
  const store = useMemo(() => new GameStore(config, seed), [config, seed]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): GameStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore outside a StoreProvider');
  return store;
}

/** Re-renders on every press. For the arena only. */
export function useGame(): GameStore {
  const store = useStore();
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}

/** Re-renders on a throttle. For the chart panels (CLAUDE.md §7). */
export function useGameThrottled(): GameStore {
  const store = useStore();
  useSyncExternalStore(store.subscribeSlow, store.getSlowVersion, store.getSlowVersion);
  return store;
}
