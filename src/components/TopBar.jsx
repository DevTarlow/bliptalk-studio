/** Top bar: title, mode tabs and the AudioContext status badge. */

import { Activity, Volume2, VolumeX } from 'lucide-react';
import { MODE_ICONS } from './iconData.js';

const AUDIO_BADGE = {
  running: { text: 'Audio ready', tone: 'text-emerald-400 border-emerald-800 bg-emerald-500/10' },
  suspended: { text: 'Click to enable audio', tone: 'text-amber-300 border-amber-800 bg-amber-500/10 pulse-soft' },
  closed: { text: 'Audio closed', tone: 'text-rose-300 border-rose-900 bg-rose-500/10' },
  unavailable: { text: 'No Web Audio', tone: 'text-rose-300 border-rose-900 bg-rose-500/10' },
};

export default function TopBar({ modes, mode, onModeChange, audioState, onUnlock }) {
  const badge = AUDIO_BADGE[audioState] ?? AUDIO_BADGE.suspended;
  const locked = audioState !== 'running';

  return (
    <header className="panel panel-accent-emerald studs px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center border-2 border-emerald-500 bg-emerald-500/15 text-emerald-400">
            <Activity size={17} strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <h1 className="crt-glow text-[15px] font-bold tracking-[0.16em] text-emerald-400 sm:text-base">
              BLIPTALK STUDIO
            </h1>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Retro dialogue blip &amp; Animalese generator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUnlock}
            title={locked ? 'Click to resume the AudioContext (browser autoplay policy)' : 'AudioContext running'}
            className={`flex items-center gap-1.5 border-2 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${badge.tone}`}
          >
            {locked ? <VolumeX size={11} strokeWidth={2.5} /> : <Volume2 size={11} strokeWidth={2.5} />}
            {badge.text}
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {modes.map((entry) => {
          const Icon = MODE_ICONS[entry.id];
          return (
            <button
              key={entry.id}
              type="button"
              className="mode-tab"
              data-active={entry.id === mode}
              title={entry.blurb}
              onClick={() => onModeChange(entry.id)}
            >
              {Icon ? <Icon size={12} strokeWidth={2.5} /> : null}
              {entry.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
