/** Preset bar — one-click voice patches. */

import { MODES } from '../audio/presets.js';

const MODE_LABEL = Object.fromEntries(MODES.map((mode) => [mode.id, mode.label]));

export default function PresetBar({ presets, activeId, onApply }) {
  return (
    <section className="panel panel-accent-amber flex flex-wrap items-center gap-1.5 px-3 py-2">
      <span className="panel-label mr-1 text-amber-500">Presets</span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="chip-btn"
          data-active={preset.id === activeId}
          title={`${MODE_LABEL[preset.mode] ?? preset.mode} — ${preset.patch.basePitch} Hz, ${preset.patch.speed} ms`}
          onClick={() => onApply(preset.id)}
        >
          {preset.name}
        </button>
      ))}
      {activeId === null ? (
        <span className="ml-auto text-[9px] uppercase tracking-[0.12em] text-slate-600">
          custom patch
        </span>
      ) : null}
    </section>
  );
}
