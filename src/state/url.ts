import type { Config, PredictorId } from '../engine/types';
import { DEFAULT_CONFIG, PREDICTOR_IDS } from '../engine/types';

/**
 * Config and seed serialise to the URL. Press history does not — it is a
 * session, and a session belongs to the person who played it (CLAUDE.md §9).
 *
 * The seed travels so a session is reproducible from its link; the presses
 * never do, so a link cannot carry someone's play away from them.
 */
export interface UrlState {
  config: Config;
  seed: number;
}

const number = (params: URLSearchParams, key: string, fallback: number): number => {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function readUrl(hash: string, defaultSeed: number): UrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const active = (params.get('models') ?? '')
    .split(',')
    .filter((id): id is PredictorId => PREDICTOR_IDS.includes(id as PredictorId));

  return {
    seed: params.has('seed') ? number(params, 'seed', defaultSeed) >>> 0 : defaultSeed,
    config: {
      decay: clamp(number(params, 'decay', DEFAULT_CONFIG.decay), 0.5, 0.999),
      confidenceFloor: clamp(number(params, 'floor', DEFAULT_CONFIG.confidenceFloor), 0.5, 0.95),
      minRounds: clamp(Math.round(number(params, 'warmup', DEFAULT_CONFIG.minRounds)), 0, 200),
      ngramOrder: clamp(Math.round(number(params, 'order', DEFAULT_CONFIG.ngramOrder)), 1, 8),
      active: active.length > 0 ? active : [...DEFAULT_CONFIG.active],
    },
  };
}

export function writeUrl({ config, seed }: UrlState): string {
  const params = new URLSearchParams();
  params.set('seed', String(seed >>> 0));
  params.set('decay', config.decay.toFixed(3));
  params.set('floor', config.confidenceFloor.toFixed(2));
  params.set('warmup', String(config.minRounds));
  params.set('order', String(config.ngramOrder));
  params.set('models', config.active.join(','));
  return `#${params.toString()}`;
}
