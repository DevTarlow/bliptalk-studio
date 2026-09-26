/** Script input panel with character counter and hotkey reminder. */

import { Eraser } from 'lucide-react';

export default function ScriptPanel({ text, onChange, onClear, maxLength }) {
  const count = Array.from(text).length;
  const atLimit = count >= maxLength;

  return (
    <section className="panel panel-accent-cyan flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b-2 border-slate-800 px-3 py-1.5">
        <span className="panel-label text-cyan-500">Your Script</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] tabular-nums ${atLimit ? 'text-amber-400' : 'text-slate-600'}`}
          >
            {count}/{maxLength}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={count === 0}
            className="flex items-center gap-1 border border-slate-800 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-slate-500 hover:border-rose-900 hover:text-rose-300 disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:text-slate-500"
          >
            <Eraser size={9} strokeWidth={2.5} />
            Clear
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        spellCheck={false}
        aria-label="Dialogue text"
        placeholder="Type the line your character should speak…"
        className="retro-textarea min-h-[86px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-700"
      />

      <div className="flex items-center justify-between gap-2 border-t-2 border-slate-800 px-3 py-1 text-[9px] uppercase tracking-[0.1em] text-slate-600">
        <span>Space = play / stop</span>
        <span>
          <kbd className="border border-slate-700 px-1">?</kbd> +150 Hz ·{' '}
          <kbd className="border border-slate-700 px-1">!</kbd> +100 Hz
        </span>
      </div>
    </section>
  );
}
