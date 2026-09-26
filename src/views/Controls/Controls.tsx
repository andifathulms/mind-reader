import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameThrottled } from '../../state/context';
import { Section } from '../../ui/Section';
import { PREDICTOR_NAMES, PREDICTOR_TINTS } from '../Ensemble/Ensemble';
import type { Config, PredictorId } from '../../engine/types';
import { PREDICTOR_IDS } from '../../engine/types';
import { writeUrl } from '../../state/url';
import { sweepSettings } from '../../engine/counterfactual';
import type { Sweep } from '../../engine/counterfactual';
import { seedFrom } from '../../engine/rng';
import { PRESETS, presetOf } from '../../engine/presets';
import './Controls.css';

/*
 * The id of the section's opening paragraph, which is the sentence saying that
 * a change here restarts the session. Every control points its description at
 * it rather than repeating the words five times.
 */
const RESTART_NOTE = 'controls-intro';

function Slider({
  label,
  note,
  value,
  display,
  min,
  max,
  step,
  onChange,
  describedBy,
}: {
  label: string;
  note: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  describedBy?: string;
}) {
  const id = `control-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const noteId = `${id}-note`;
  // The track paints its own fill, so the slider reads as a quantity rather
  // than as a dot on a line. The browser gives no way to style the part of the
  // track behind the thumb, so the position is handed to CSS as a percentage.
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="control" style={{ '--fill': `${fill.toFixed(2)}%` } as CSSProperties}>
      <label className="control__label" htmlFor={id}>
        <span className="control__name">{label}</span>
        {/*
          Out of the accessible name. The label wrapped this, so the slider was
          called "Confidence threshold 55%" and then announced 55% again as its
          value — and the name changed on every step of a drag, which is the one
          thing a name must not do. It stays visible; it is just no longer the
          control's name.
        */}
        <span className="control__value numeral" aria-hidden="true">
          {display}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        /*
         * aria-valuetext, because the number the input holds is not the number
         * on the screen: 0.55 is shown as 55%, and 20 as "20 rounds". There is
         * no native way to say that, and without it the slider reads out a bare
         * decimal that matches nothing the reader can see.
         */
        aria-valuetext={display}
        aria-describedby={describedBy ? `${noteId} ${describedBy}` : noteId}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="control__note" id={noteId}>
        {note}
      </p>
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

  /*
   * What just happened, for a reader who cannot see the session empty itself.
   *
   * Reaching a control by form navigation skips the section's prose entirely,
   * so the warning above was reaching nobody who most needed it: they moved a
   * slider and their session was gone with no indication anything had occurred.
   *
   * The discarded count is in the message because it is the part worth hearing,
   * and because it settles by itself: after the first restart there is nothing
   * left to discard, so dragging a slider announces once and then repeats a
   * stable sentence rather than a new one per step.
   */
  const [announcement, setAnnouncement] = useState('');
  const [sweeps, setSweeps] = useState<Sweep[] | null>(null);

  const apply = useCallback(
    (next: Partial<Config>, nextSeed = seed) => {
      const discarded = store.rounds.length;
      const merged = { ...config, ...next };
      store.reconfigure(merged, nextSeed);
      window.history.replaceState(null, '', writeUrl({ config: merged, seed: nextSeed }));
      setAnnouncement(
        discarded > 0
          ? `Settings changed. The session has restarted and ${discarded} ${
              discarded === 1 ? 'round was' : 'rounds were'
            } discarded.`
          : 'Settings changed. The session has restarted.',
      );
    },
    [config, seed, store],
  );

  const current = presetOf(config);

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
      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      {/*
        Three named points on the sliders below. A preset is a shortcut, not a
        mode: choosing one moves the sliders and restarts the session like any
        other change. Radios, because exactly one or none of them is true —
        none when the sliders have been moved somewhere else.
      */}
      <fieldset className="presets" aria-describedby={RESTART_NOTE}>
        <legend className="control__label">
          <span className="control__name">Strength</span>
          <span className="control__value">
            {current ? PRESETS.find((p) => p.id === current)?.name : 'Custom'}
          </span>
        </legend>
        <div className="presets__options">
          {PRESETS.map((preset) => (
            <label
              key={preset.id}
              className={`presets__option${current === preset.id ? ' presets__option--on' : ''}`}
            >
              <input
                type="radio"
                name="preset"
                value={preset.id}
                checked={current === preset.id}
                onChange={() => apply(preset.config)}
              />
              <span className="presets__name">{preset.name}</span>
              <span className="presets__note">{preset.note}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
          describedBy={RESTART_NOTE}
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
          describedBy={RESTART_NOTE}
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
          describedBy={RESTART_NOTE}
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
          describedBy={RESTART_NOTE}
        />

        {/*
          A real fieldset. These five were five unrelated checkboxes with
          nothing naming them as a set or saying what the set was for, because
          the heading above them was a span (WCAG 1.3.1).
        */}
        <fieldset className="control control--models" aria-describedby={RESTART_NOTE}>
          <legend className="control__label">
            <span className="control__name">Models in the mixture</span>
            <span className="control__value numeral">
              {config.active.length} of {PREDICTOR_IDS.length}
            </span>
          </legend>
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
        </fieldset>
      </div>

      {/*
        The answer to "what would it have done at a lower floor", without
        having to destroy the session that provoked the question. Every control
        above restarts, for a good reason, and that reason was costing the
        player the one experiment they most wanted to run.
      */}
      <div className="sweep">
        <h3 className="sweep__heading">The same presses, at other settings</h3>
        <p className="sweep__intro">
          Your {played} {played === 1 ? 'press is' : 'presses are'} already fixed. They can be
          played again against a machine tuned differently without restarting anything.
        </p>
        <button
          className="button controls__button"
          type="button"
          onClick={() => setSweeps(sweepSettings(store.history, config, seed))}
          disabled={played === 0}
        >
          {played === 0 ? 'Play a round first' : 'Replay at other settings'}
        </button>

        {sweeps
          ? sweeps.map((sweep) => (
              <div className="sweep__group" key={sweep.setting}>
                <h4 className="sweep__name">{sweep.label}</h4>
                <ul className="sweep__points">
                  {sweep.points.map((point) => (
                    <li
                      className={`sweep__point${point.current ? ' sweep__point--current' : ''}`}
                      key={point.value}
                    >
                      <span className="sweep__value numeral">{point.display}</span>
                      <span className="sweep__bar" aria-hidden="true">
                        <span
                          className="sweep__fill"
                          style={{ width: `${(point.rate * 100).toFixed(2)}%` }}
                        />
                        <span className="sweep__even" />
                      </span>
                      <span className="sweep__rate numeral">{Math.round(point.rate * 100)}%</span>
                      {point.current ? <span className="sweep__tag">as played</span> : null}
                    </li>
                  ))}
                </ul>
                <p className="sweep__note">{sweep.note}</p>
              </div>
            ))
          : null}

        {sweeps ? (
          <p className="sweep__caveat">
            These are scores against a frozen sequence, not scores against you. Facing a machine
            tuned differently you would have pressed differently, because what you pressed was
            partly a response to what this one was doing. The presses cannot be replayed as a
            person; only as a recording.
          </p>
        ) : null}
      </div>

      <div className="controls__footer">
        <button className="button controls__button" type="button" onClick={() => apply({}, seed)}>
          Restart, same seed
        </button>
        <button
          className="button controls__button"
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
