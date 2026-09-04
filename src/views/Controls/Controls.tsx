import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { PREDICTOR_NAMES, PREDICTOR_TINTS } from '../Ensemble/Ensemble';
import type { Config, PredictorId } from '../../engine/types';
import { PREDICTOR_IDS } from '../../engine/types';
import { writeUrl } from '../../state/url';
import { seedFrom } from '../../engine/rng';
import './Controls.css';

function Slider({
  label,
  note,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  note: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = `control-${label.replace(/\W+/g, '-').toLowerCase()}`;
  // The track paints its own fill, so the slider reads as a quantity rather
  // than as a dot on a line. The browser gives no way to style the part of the
  // track behind the thumb, so the position is handed to CSS as a percentage.
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="control" style={{ '--fill': `${fill.toFixed(2)}%` } as CSSProperties}>
      <label className="control__label" htmlFor={id}>
        <span className="control__name">{label}</span>
        <span className="control__value numeral">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="control__note">{note}</p>
    </div>
  );
}

/**
 * The machine's controls.
 *
 * The confidence threshold is the one that matters. At its floor the machine
 * always plays its guess: stronger against a person, and exploitable by anyone
 * who reverse-engineers it. That trade-off is meant to be felt rather than
 * described (PRD §4.4), so it is a slider next to the ensemble rather than a
 * paragraph in the archive.
 *
 * Every change restarts the session, because the weights and the predictors
 * carry state that was built under the old settings and reading it under new
 * ones would be a different experiment.
 */
export function Controls() {
  const store = useGameThrottled();
  const config = store.currentConfig;
  const seed = store.currentSeed;
  const played = store.rounds.length;

  const apply = useCallback(
    (next: Partial<Config>, nextSeed = seed) => {
      const merged = { ...config, ...next };
      store.reconfigure(merged, nextSeed);
      window.history.replaceState(null, '', writeUrl({ config: merged, seed: nextSeed }));
    },
    [config, seed, store],
  );

  const toggle = (id: PredictorId) => {
    const active = config.active.includes(id)
      ? config.active.filter((other) => other !== id)
      : [...config.active, id];
    // One model must remain, or there is no machine.
    if (active.length === 0) return;
    apply({ active });
  };

  return (
    <Section
      id="controls"
      title="The machine's settings"
      ground="machine"
      eyebrow="controls"
      intro="Every change here restarts the session: the weights were built under the old settings and reading them under new ones would be a different experiment."
    >
      <div className="controls">
        <Slider
          label="Confidence threshold"
          display={`${Math.round(config.confidenceFloor * 100)}%`}
          note="How sure the machine must be before it claims a guess. Below this it plays a fair bit. Drop it to 50% and the machine always plays its guess — stronger against you, and exploitable by anyone who works out its state."
          value={config.confidenceFloor}
          min={0.5}
          max={0.95}
          step={0.01}
          onChange={(confidenceFloor) => apply({ confidenceFloor })}
        />
        <Slider
          label="Weight decay"
          display={config.decay.toFixed(2)}
          note="How fast a model's record fades. Lower forgets sooner and follows a change of strategy faster; higher is steadier and slower to notice."
          value={config.decay}
          min={0.5}
          max={0.995}
          step={0.005}
          onChange={(decay) => apply({ decay })}
        />
        <Slider
          label="Warm-up"
          display={`${config.minRounds} rounds`}
          note="Rounds played uniformly at random before any model is trusted. The machine has no basis for a guess this early and does not pretend to."
          value={config.minRounds}
          min={0}
          max={100}
          step={1}
          onChange={(minRounds) => apply({ minRounds })}
        />
        <Slider
          label="N-gram order"
          display={String(config.ngramOrder)}
          note="How many past presses the fixed-order model conditions on. Longer contexts are sharper and take much more play to fill."
          value={config.ngramOrder}
          min={1}
          max={8}
          step={1}
          onChange={(ngramOrder) => apply({ ngramOrder })}
        />

        <div className="control control--models">
          <span className="control__label">
            <span className="control__name">Models in the mixture</span>
            <span className="control__value numeral">{config.active.length} of 5</span>
          </span>
          <div className="control__models">
            {PREDICTOR_IDS.map((id) => (
              <label
                className="control__model"
                key={id}
                style={{ '--tint': PREDICTOR_TINTS[id] } as CSSProperties}
              >
                <input
                  className="visually-hidden"
                  type="checkbox"
                  checked={config.active.includes(id)}
                  onChange={() => toggle(id)}
                />
                <span className="control__swatch" aria-hidden="true" />
                {PREDICTOR_NAMES[id]}
              </label>
            ))}
          </div>
          <p className="control__note">
            Leave one checked to face a single machine alone. SEER or MRM on their own are the 1950s
            devices as built.
          </p>
        </div>
      </div>

      <div className="controls__footer">
        <button className="controls__button" type="button" onClick={() => apply({}, seed)}>
          Restart, same seed
        </button>
        <button
          className="controls__button"
          type="button"
          onClick={() => apply({}, seedFrom(Date.now()))}
        >
          Restart, new seed
        </button>
        <p className="controls__warning">
          Seed {seed >>> 0}. The seed and these settings are in the address bar, so a link
          reproduces this machine exactly. Your presses are not in it and never will be.
          {played > 0 ? ` ${played} rounds will be discarded.` : ''}
        </p>
      </div>
    </Section>
  );
}
