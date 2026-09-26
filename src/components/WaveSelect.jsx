/** Segmented waveform picker with miniature waveform glyphs. */

import WaveGlyph from './WaveGlyph.jsx';
import { WAVE_LABELS } from './iconData.js';
import { WAVEFORMS } from '../audio/intonation.js';

export default function WaveSelect({ value, onChange, note }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Waveform
        </span>
        {note ? <span className="text-[9px] text-slate-600">{note}</span> : null}
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Waveform">
        {WAVEFORMS.map((wave) => (
          <button
            key={wave}
            type="button"
            role="radio"
            aria-checked={value === wave}
            className="wave-btn"
            data-active={value === wave}
            title={WAVE_LABELS[wave]}
            onClick={() => onChange(wave)}
          >
            <WaveGlyph wave={wave} />
            <span>{WAVE_LABELS[wave]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
