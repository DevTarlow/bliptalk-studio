/** Labelled retro range slider with a live value readout. */

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
  const display = format ? format(value) : `${value}${unit}`;
  return (
    <label className={`block select-none ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-emerald-300">{display}</span>
      </div>
      <input
        type="range"
        className="retro-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? <p className="mt-0.5 text-[9px] leading-tight text-slate-600">{hint}</p> : null}
    </label>
  );
}
