import type { Config } from './types';
import { DEFAULT_CONFIG } from './types';

export type PresetId = '1953' | 'standard' | 'relentless';

export interface Preset {
  id: PresetId;
  name: string;
  /** What changes, in one line. */
  note: string;
  config: Config;
}

/**
 * Three named starting points over the same settings the sliders already
 * expose. A preset is a shortcut, not a mode: choosing one sets the sliders,
 * restarts the session like any other change, and serialises to the URL as the
 * values it set. Nothing here is available that the sliders could not reach.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: '1953',
    name: '1953',
    note: 'Only the two relay machines, SEER and MRM, as they were built.',
    config: { ...DEFAULT_CONFIG, active: ['seer', 'mrm'] },
  },
  {
    id: 'standard',
    name: 'Standard',
    note: 'All eight models, a 12-round warm-up and a 52% floor.',
    config: { ...DEFAULT_CONFIG },
  },
  {
    id: 'relentless',
    name: 'Relentless',
    note: 'All eight models, an 8-round warm-up and no floor: it always plays its guess.',
    config: { ...DEFAULT_CONFIG, confidenceFloor: 0.5, minRounds: 8 },
  },
];

/** The preset a config matches exactly, if any. */
export function presetOf(config: Config): PresetId | null {
  const same = (a: Config, b: Config) =>
    a.decay === b.decay &&
    a.confidenceFloor === b.confidenceFloor &&
    a.minRounds === b.minRounds &&
    a.ngramOrder === b.ngramOrder &&
    a.active.length === b.active.length &&
    a.active.every((id) => b.active.includes(id));
  return PRESETS.find((p) => same(p.config, config))?.id ?? null;
}
