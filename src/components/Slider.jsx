/** Labelled retro range slider with an editable numeric value box. */

import { useId, useState } from 'react';

import { parseNumericInput } from '../utils/numericInput.js';

export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  hint,
  disabled = false,
  format,
  onChange,
}) {
  const rangeId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState(null);

  const display = format ? format(value) : String(value);
  const unitLabel = unit.trim();
  const bounds = { min, max, step };

  const commit = (raw = draft) => {
    if (raw === null) return;
    const parsed = parseNumericInput(raw, bounds);
    setDraft(null);
    if (parsed !== null && parsed !== value) onChange(parsed);
  };

  const nudge = (direction) => {
    const parsed = parseNumericInput(draft ?? value, bounds);
    const base = parsed ?? value;
    const next = parseNumericInput(String(base + direction * step), bounds);
    setDraft(null);
    if (next !== null && next !== value) onChange(next);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      // Cancel the edit without letting the global "stop playback" hotkey run.
      event.preventDefault();
      event.stopPropagation();
      setDraft(null);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      nudge(event.key === 'ArrowUp' ? 1 : -1);
    }
  };

  return (
    <div className={`select-none ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          htmlFor={rangeId}
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          {label}
        </label>
        <span className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            className="retro-number"
            value={draft ?? display}
            disabled={disabled}
            aria-label={`${label} value${unitLabel ? ` in ${unitLabel}` : ''}`}
            aria-describedby={hint ? hintId : undefined}
            title={`${min}–${max}${unitLabel ? ` ${unitLabel}` : ''}`}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => commit()}
            onKeyDown={handleKeyDown}
          />
          {unitLabel ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
              {unitLabel}
            </span>
          ) : null}
        </span>
      </div>
      <input
        id={rangeId}
        type="range"
        className="retro-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? (
        <p id={hintId} className="mt-0.5 text-[9px] leading-tight text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
