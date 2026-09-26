/** Transport & export actions, plus the status readout. */

import {
  CircleAlert,
  Download,
  Info,
  LoaderCircle,
  Package,
  Play,
  RotateCcw,
  Square,
  TriangleAlert,
} from 'lucide-react';

const TONE_STYLES = {
  info: 'text-slate-400',
  ok: 'text-emerald-400',
  warn: 'text-amber-300',
  error: 'text-rose-300',
};

function StatusIcon({ tone }) {
  if (tone === 'ok') return <Info size={12} strokeWidth={2.5} className="mt-px text-emerald-400" />;
  if (tone === 'warn') return <TriangleAlert size={12} strokeWidth={2.5} className="mt-px text-amber-300" />;
  if (tone === 'error') return <CircleAlert size={12} strokeWidth={2.5} className="mt-px text-rose-300" />;
  return <Info size={12} strokeWidth={2.5} className="mt-px text-slate-500" />;
}

export default function ActionBar({
  isPlaying,
  busy,
  canSpeak,
  status,
  onPlay,
  onStop,
  onExportWav,
  onExportPack,
}) {
  const rendering = busy !== null;

  return (
    <section className="panel px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPlay}
          disabled={!canSpeak || rendering}
          title={
            !canSpeak ? 'Type a line first' : 'Play the dialogue (Spacebar)'
          }
        >
          {isPlaying ? <RotateCcw size={13} strokeWidth={2.5} /> : <Play size={13} strokeWidth={2.5} />}
          {isPlaying ? 'Restart' : 'Play Dialogue'}
          <kbd className="ml-1 border border-emerald-800/70 bg-emerald-950/40 px-1 text-[9px] tracking-normal">
            Space
          </kbd>
        </button>

        <button
          type="button"
          className="btn btn-stop"
          onClick={onStop}
          disabled={!isPlaying}
          title="Stop playback (Esc)"
        >
          <Square size={12} strokeWidth={2.5} />
          Stop
        </button>

        <button
          type="button"
          className="btn btn-cyan"
          onClick={onExportWav}
          disabled={!canSpeak || rendering}
          title="Render the line offline and download dialogue_blip.wav"
        >
          {busy === 'wav' ? (
            <LoaderCircle size={13} strokeWidth={2.5} className="animate-spin" />
          ) : (
            <Download size={13} strokeWidth={2.5} />
          )}
          {busy === 'wav' ? 'Rendering…' : 'Export WAV File'}
        </button>

        <button
          type="button"
          className="btn btn-amber"
          onClick={onExportPack}
          disabled={rendering}
          title="Download 5 single-character blips for engine triggering"
        >
          {busy === 'pack' ? (
            <LoaderCircle size={13} strokeWidth={2.5} className="animate-spin" />
          ) : (
            <Package size={13} strokeWidth={2.5} />
          )}
          {busy === 'pack' ? 'Rendering…' : 'Export Blip Pack'}
        </button>
      </div>

      <div className="mt-2 flex items-start gap-2 border-t-2 border-slate-800 pt-2">
        <StatusIcon tone={status.tone} />
        <p className={`text-[10px] leading-relaxed ${TONE_STYLES[status.tone] ?? TONE_STYLES.info}`}>
          {status.text}
        </p>
      </div>
    </section>
  );
}
