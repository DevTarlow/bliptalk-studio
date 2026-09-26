/** The typewriter dialogue box: reveals text in sync with the audio. */

import { useMemo } from 'react';
import Scope from './Scope.jsx';

export default function DialogBox({ text, activeIndex, progress, isPlaying, engine, modeLabel }) {
  // Code-point split so emoji/surrogate pairs behave as single characters, and
  // so indices line up with the engine's highlight callbacks.
  const chars = useMemo(() => Array.from(text), [text]);
  const revealed = isPlaying && activeIndex >= 0 ? activeIndex : chars.length - 1;

  return (
    <section className="panel panel-accent-emerald scanlines relative flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b-2 border-slate-800 px-3 py-1.5">
        <span className="panel-label text-emerald-500">Dialogue Preview</span>
        <div className="flex items-center gap-2">
          <span className="hidden text-[9px] uppercase tracking-[0.12em] text-slate-600 sm:inline">
            {modeLabel}
          </span>
          <Scope engine={engine} active={isPlaying} />
        </div>
      </div>

      <div className="relative min-h-[86px] flex-1 overflow-hidden px-3 py-3">
        {chars.length === 0 ? (
          <p className="text-[13px] text-slate-600">// type a line below, then hit play</p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-slate-100">
            {chars.map((char, index) => {
              const isActive = isPlaying && index === activeIndex;
              const isPending = index > revealed;
              return (
                <span
                  // eslint-disable-next-line react/no-array-index-key -- character positions are the identity here
                  key={index}
                  className={isActive ? 'char-active' : isPending ? 'char-pending' : undefined}
                >
                  {char}
                </span>
              );
            })}
            <span
              className={`ml-0.5 inline-block h-[15px] w-[9px] translate-y-[2px] align-baseline ${
                isPlaying ? 'bg-emerald-300' : 'blink bg-emerald-500'
              }`}
            />
          </p>
        )}
      </div>

      <div className="h-1.5 w-full border-t-2 border-slate-800 bg-slate-950">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </section>
  );
}
