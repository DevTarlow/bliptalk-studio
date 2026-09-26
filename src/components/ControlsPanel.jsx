/** Controls panel: six sliders, waveform picker and the intonation toggle. */

import Slider from './Slider.jsx';
import Toggle from './Toggle.jsx';
import WaveSelect from './WaveSelect.jsx';

const MODE_NOTES = {
  chiptune: 'oscillator blips · NES style',
  animalese: 'formant slices per letter',
  robotic: 'bitcrush + ring modulation',
};

/** Waveform only colours Animalese through vowel brightness — be honest about it. */
const WAVE_NOTES = {
  chiptune: 'oscillator shape',
  animalese: 'vowel brightness',
  robotic: 'carrier shape',
};

export default function ControlsPanel({ config, mode, onChange }) {
  const lettersPerSecond = (1000 / config.speed).toFixed(0);

  return (
    <section className="panel panel-accent-emerald px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="panel-label text-emerald-500">Voice Controls</span>
        <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
          {MODE_NOTES[mode] ?? ''}
        </span>
      </div>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Slider
          label="Base Pitch"
          value={config.basePitch}
          min={100}
          max={1200}
          step={5}
          unit=" Hz"
          hint="Register of the voice"
          onChange={(value) => onChange({ basePitch: value })}
        />
        <Slider
          label="Speed / Interval"
          value={config.speed}
          min={10}
          max={150}
          step={1}
          unit=" ms"
          hint={`≈ ${lettersPerSecond} letters / second`}
          onChange={(value) => onChange({ speed: value })}
        />
        <Slider
          label="Pitch Variation"
          value={config.jitter}
          min={0}
          max={200}
          step={1}
          unit=" Hz"
          hint="Random wobble per character"
          onChange={(value) => onChange({ jitter: value })}
        />
        <Slider
          label="Volume"
          value={Math.round(config.volume * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(value) => onChange({ volume: value / 100 })}
        />
        <Slider
          label="Envelope Decay"
          value={config.decay}
          min={15}
          max={900}
          step={5}
          unit=" ms"
          hint="Note length (staccato → smooth)"
          onChange={(value) => onChange({ decay: value })}
        />
        <Slider
          label="Formant / Crush"
          value={config.voiceCharacter}
          min={0.4}
          max={2.4}
          step={0.05}
          format={(value) => value.toFixed(2)}
          hint="Vowel colour · quantiser grit"
          onChange={(value) => onChange({ voiceCharacter: value })}
        />
      </div>

      <div className="mt-3 grid items-end gap-3 border-t-2 border-slate-800 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <WaveSelect
          value={config.waveform}
          note={WAVE_NOTES[mode] ?? ''}
          onChange={(value) => onChange({ waveform: value })}
        />
        <div className="sm:pb-1">
          <Toggle
            label="Punctuation Intonation"
            checked={config.punctuation}
            hint="? rises 150 Hz · ! rises 100 Hz · . and , fall, with longer pauses"
            onChange={(value) => onChange({ punctuation: value })}
          />
        </div>
      </div>
    </section>
  );
}
