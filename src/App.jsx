/**
 * BlipTalk Studio — application shell.
 *
 * Owns: the synth engine instance, the voice config, playback state and the
 * export actions. Every audible behaviour lives in `src/audio/`; this file is
 * wiring and layout only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SynthEngine } from './audio/SynthEngine.js';
import { normalizeConfig } from './audio/intonation.js';
import {
  DEFAULT_PRESET_ID,
  DEFAULT_TEXT,
  MAX_TEXT_LENGTH,
  MODES,
  MODE_DEFAULT_PRESET,
  PRESETS,
  presetConfig,
} from './audio/presets.js';
import { formatBytes } from './audio/wav.js';

import ActionBar from './components/ActionBar.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';
import DialogBox from './components/DialogBox.jsx';
import PresetBar from './components/PresetBar.jsx';
import ScriptPanel from './components/ScriptPanel.jsx';
import TopBar from './components/TopBar.jsx';

import { downloadBlob, wait } from './utils/download.js';

const INITIAL_STATUS = {
  text: 'Ready. Pick a preset, type a line, then press Play (or hit Space).',
  tone: 'info',
};

export default function App() {
  // One engine per app instance. Constructing it does not create an
  // AudioContext — that happens on the first user gesture, per autoplay policy.
  const [engine] = useState(() => new SynthEngine());

  const [text, setText] = useState(DEFAULT_TEXT);
  const [config, setConfig] = useState(() => presetConfig(DEFAULT_PRESET_ID));
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(null);
  // Browsers start AudioContexts suspended until a gesture, so "locked" is the
  // honest initial state — 'unavailable' is reserved for a missing Web Audio API.
  const [audioState, setAudioState] = useState('suspended');
  const [status, setStatus] = useState(INITIAL_STATUS);

  /** Last whole-percent progress pushed into React (avoids 60 fps re-renders). */
  const progressRef = useRef(-1);

  const canSpeak = text.trim().length > 0;
  const modeLabel = useMemo(
    () => MODES.find((mode) => mode.id === config.mode)?.label ?? '',
    [config.mode],
  );

  // ---- autoplay policy: resume the context on the first user gesture -------
  useEffect(() => {
    const unlock = () => {
      engine.unlock().then(setAudioState);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    for (const name of events) {
      window.addEventListener(name, unlock, { once: true, passive: true });
    }
    return () => {
      for (const name of events) window.removeEventListener(name, unlock);
    };
  }, [engine]);

  // Release the AudioContext when the app unmounts.
  useEffect(() => () => engine.dispose(), [engine]);

  // ---- playback ------------------------------------------------------------
  const handleChar = useCallback((index, ratio) => {
    setActiveIndex(index);
    const percent = Math.round((ratio ?? 0) * 100);
    if (percent !== progressRef.current) {
      progressRef.current = percent;
      setProgress(percent / 100);
    }
  }, []);

  const handleStop = useCallback(() => {
    if (!engine.stop()) {
      setStatus({ text: 'Nothing is playing right now.', tone: 'info' });
    }
  }, [engine]);

  const handlePlay = useCallback(async () => {
    if (engine.isPlaying) {
      engine.stop();
      return;
    }
    if (!canSpeak) {
      setStatus({ text: 'Type a line first — the voice needs something to say.', tone: 'warn' });
      return;
    }

    setStatus({ text: 'Unlocking the audio context…', tone: 'info' });
    const state = await engine.unlock();
    setAudioState(state);
    if (state !== 'running') {
      setStatus({
        text: 'The browser blocked audio. Click anywhere on the page once, then press Play again.',
        tone: 'warn',
      });
      return;
    }

    engine.setVolume(config.volume);
    progressRef.current = -1;
    setProgress(0);
    setIsPlaying(true);

    // `spoken` is assigned synchronously right after playText returns; onEnd
    // only fires later, except for the empty-performance case handled below.
    let spoken = 0;
    const handle = engine.playText(text, config, handleChar, (reason) => {
      setIsPlaying(false);
      setActiveIndex(-1);
      setProgress(0);
      progressRef.current = -1;
      if (reason === 'ended') {
        setStatus({
          text: `Spoke ${Array.from(text).length} characters in ${spoken.toFixed(2)}s.`,
          tone: 'ok',
        });
      }
    });
    spoken = handle.duration;

    if (spoken === 0) {
      setIsPlaying(false);
      setStatus({ text: 'That line has no speakable characters.', tone: 'warn' });
    }
  }, [engine, canSpeak, config, text, handleChar]);

  // Spacebar transport. Ignored while typing so the textarea keeps its spaces.
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.code === 'Space' && !typing && !event.repeat && busy === null) {
        event.preventDefault();
        handlePlay();
      } else if (event.code === 'Escape' && !busy) {
        handleStop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlay, handleStop, busy]);

  // ---- config --------------------------------------------------------------
  const updateConfig = useCallback((patch) => {
    setConfig((previous) => normalizeConfig({ ...previous, ...patch }));
    setPresetId(null); // any manual tweak becomes a custom patch
  }, []);

  const applyPreset = useCallback((id) => {
    const preset = PRESETS.find((entry) => entry.id === id);
    setConfig(presetConfig(id));
    setPresetId(id);
    setStatus({
      text: preset
        ? `Preset “${preset.name}” loaded — ${MODES.find((m) => m.id === preset.mode)?.label ?? preset.mode}.`
        : 'Preset loaded.',
      tone: 'info',
    });
  }, []);

  const changeMode = useCallback(
    (mode) => {
      if (mode === config.mode) return;
      // Presets carry their mode, so switching tabs while a preset is active
      // loads that mode's signature patch. Hand-tuned patches are preserved.
      if (presetId !== null) {
        applyPreset(MODE_DEFAULT_PRESET[mode] ?? DEFAULT_PRESET_ID);
        return;
      }
      updateConfig({ mode });
      setStatus({
        text: `Synth mode: ${MODES.find((m) => m.id === mode)?.label ?? mode}.`,
        tone: 'info',
      });
    },
    [config.mode, presetId, applyPreset, updateConfig],
  );

  const handleTextChange = useCallback(
    (value) => {
      // Highlight indices are tied to the text, so stop rather than desync.
      if (engine.isPlaying) engine.stop();
      setText(value);
    },
    [engine],
  );

  // ---- exports -------------------------------------------------------------
  const handleExportWav = useCallback(async () => {
    if (busy !== null) return;
    if (!canSpeak) {
      setStatus({ text: 'Nothing to export — type a line first.', tone: 'warn' });
      return;
    }
    engine.stop();
    setBusy('wav');
    setStatus({ text: 'Rendering offline (OfflineAudioContext)…', tone: 'info' });
    try {
      const result = await engine.exportWav(text, config);
      downloadBlob(result.blob, result.filename);
      setStatus({
        text: `Saved ${result.filename} — ${result.duration.toFixed(2)}s, ${formatBytes(result.bytes)}, ${result.sampleRate} Hz mono 16-bit PCM.`,
        tone: 'ok',
      });
    } catch (error) {
      setStatus({ text: `WAV export failed: ${error.message}`, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }, [busy, canSpeak, engine, text, config]);

  const handleExportPack = useCallback(async () => {
    if (busy !== null) return;
    engine.stop();
    setBusy('pack');
    setStatus({ text: 'Rendering 5 single-character blips offline…', tone: 'info' });
    try {
      const items = await engine.exportBlipPack(config);
      for (let i = 0; i < items.length; i += 1) {
        downloadBlob(items[i].blob, items[i].name);
        // Stagger: browsers drop simultaneous programmatic downloads.
        if (i < items.length - 1) await wait(180);
      }
      const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
      setStatus({
        text: `Saved ${items.length} blips (${items.map((item) => item.label).join(', ')}) — ${formatBytes(bytes)} total. Your browser may ask to allow multiple downloads.`,
        tone: 'ok',
      });
    } catch (error) {
      setStatus({ text: `Blip pack export failed: ${error.message}`, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }, [busy, engine, config]);

  // ---- render --------------------------------------------------------------
  return (
    <div className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-3">
        <TopBar
          modes={MODES}
          mode={config.mode}
          onModeChange={changeMode}
          audioState={audioState}
          onUnlock={() => engine.unlock().then(setAudioState)}
        />

        <div className="grid items-stretch gap-3 md:grid-cols-2">
          <DialogBox
            text={text}
            activeIndex={activeIndex}
            progress={progress}
            isPlaying={isPlaying}
            engine={engine}
            modeLabel={modeLabel}
          />
          <ScriptPanel
            text={text}
            onChange={handleTextChange}
            onClear={() => handleTextChange('')}
            maxLength={MAX_TEXT_LENGTH}
          />
        </div>

        <ControlsPanel config={config} mode={config.mode} onChange={updateConfig} />

        <PresetBar presets={PRESETS} activeId={presetId} onApply={applyPreset} />

        <ActionBar
          isPlaying={isPlaying}
          busy={busy}
          canSpeak={canSpeak}
          status={status}
          onPlay={handlePlay}
          onStop={handleStop}
          onExportWav={handleExportWav}
          onExportPack={handleExportPack}
        />

        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">
          <span>Web Audio API · no samples · nothing leaves your browser</span>
          <span>
            <kbd className="border border-slate-700 px-1">Space</kbd> play ·{' '}
            <kbd className="border border-slate-700 px-1">Esc</kbd> stop
          </span>
        </footer>
      </div>
    </div>
  );
}
