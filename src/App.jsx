/**
 * BlipTalk Studio — application shell.
 *
 * Owns: the synth engine instance, the voice config, playback state and the
 * export actions. Every audible behaviour lives in `src/audio/`; this file is
 * wiring and layout only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SynthEngine } from './audio/SynthEngine.js';
import { analyzeText, normalizeConfig } from './audio/intonation.js';
import {
  MAX_TEXT_LENGTH,
  MODES,
  MODE_DEFAULT_PRESET,
  PRESETS,
  configFromPreset,
  findPreset,
} from './audio/presets.js';
import {
  MAX_USER_PRESETS,
  addUserPreset,
  deleteUserPreset,
  isPresetNameTaken,
  loadPresetStore,
  persistPresetStore,
  resolvePresets,
  sanitizePresetName,
  updateUserPreset,
} from './audio/presetStore.js';
import {
  MAX_IMPORT_BYTES,
  createPresetBundle,
  mergePresetBundle,
  parsePresetBundle,
  presetBundleFilename,
  serializePresetBundle,
} from './audio/presetTransfer.js';
import {
  hydrateWorkspace,
  loadWorkspace,
  persistWorkspace,
} from './audio/workspaceStore.js';
import { formatBytes } from './audio/wav.js';

import ActionBar from './components/ActionBar.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';
import DialogBox from './components/DialogBox.jsx';
import PresetBar from './components/PresetBar.jsx';
import ScriptPanel from './components/ScriptPanel.jsx';
import TopBar from './components/TopBar.jsx';

import { downloadBlob, wait } from './utils/download.js';
import { createZipBlob } from './utils/zip.js';
import { APP_VERSION } from './version.js';

const INITIAL_STATUS = {
  text: 'Ready. Pick a preset, type a line, then press Play (or hit Space).',
  tone: 'info',
};

/** Load everything the app needs before the first render. */
function createBootState() {
  const presetStore = loadPresetStore();
  const hydrated = hydrateWorkspace(loadWorkspace(), resolvePresets(presetStore));
  return { presetStore, ...hydrated };
}

/** A quiet status line when the previous tab/browser state was recovered. */
function restoreStatus({ restoredText, restoredConfig }) {
  if (restoredText && restoredConfig) {
    return {
      text: 'Restored your last line for this tab and your voice settings.',
      tone: 'info',
    };
  }
  if (restoredText) {
    return { text: 'Restored your last line for this tab.', tone: 'info' };
  }
  if (restoredConfig) {
    return { text: 'Restored your voice settings.', tone: 'info' };
  }
  return INITIAL_STATUS;
}

export default function App() {
  // One engine per app instance. Constructing it does not create an
  // AudioContext — that happens on the first user gesture, per autoplay policy.
  const [engine] = useState(() => new SynthEngine());

  // Load the preset store, the last-session voice state and the tab draft once.
  const [boot] = useState(createBootState);

  // Built-in presets are fixed; only user-created presets are persisted.
  const [presetStore, setPresetStore] = useState(boot.presetStore);

  const [text, setText] = useState(boot.text);
  const [config, setConfig] = useState(boot.config);
  const [presetId, setPresetId] = useState(boot.presetId);
  const [customized, setCustomized] = useState(boot.customized);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(null);
  // Browsers start AudioContexts suspended until a gesture, so "locked" is the
  // honest initial state — 'unavailable' is reserved for a missing Web Audio API.
  const [audioState, setAudioState] = useState('suspended');
  const [status, setStatus] = useState(() => restoreStatus(boot));

  /** Last whole-percent progress pushed into React (avoids 60 fps re-renders). */
  const progressRef = useRef(-1);

  const canSpeak = text.trim().length > 0;
  const modeLabel = useMemo(
    () => MODES.find((mode) => mode.id === config.mode)?.label ?? '',
    [config.mode],
  );

  const allPresets = useMemo(() => resolvePresets(presetStore), [presetStore]);
  const sourcePreset = useMemo(
    () => findPreset(presetId, allPresets),
    [presetId, allPresets],
  );
  const sourceUserPreset = useMemo(
    () => findPreset(presetId, presetStore.userPresets),
    [presetId, presetStore.userPresets],
  );
  const sourceIsBuiltIn = Boolean(sourcePreset) && !sourceUserPreset;

  // Duration is independent of the random seed, so a fixed seed keeps this
  // cheap perceptual preview stable while the sliders move.
  const estimatedDuration = useMemo(() => {
    if (!text.trim()) return 0;
    return analyzeText(text, config, 0).duration;
  }, [text, config]);

  // Autosave the voice state to localStorage and the typed line to
  // sessionStorage. The ref gives the pagehide flush the latest render without
  // re-registering the listener on every keystroke.
  const workspaceRef = useRef({ text, config, presetId, customized });

  useEffect(() => {
    workspaceRef.current = { text, config, presetId, customized };
  }, [text, config, presetId, customized]);

  useEffect(() => {
    const timer = setTimeout(() => {
      persistWorkspace(workspaceRef.current);
    }, 400);
    return () => clearTimeout(timer);
  }, [text, config, presetId, customized]);

  useEffect(() => {
    const flush = () => {
      persistWorkspace(workspaceRef.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

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

  const startPlayback = useCallback(async () => {
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
    // On a restart the old take must end before `isPlaying` is set. Its
    // onEnd('stopped') callback runs synchronously and would otherwise flip the
    // new performance back to "not playing" right after it starts.
    engine.stop();
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

  // Spacebar transport: play when stopped, stop when playing. The Play button
  // uses startPlayback directly so its "Restart" label is truthful.
  const handlePlayToggle = useCallback(() => {
    if (engine.isPlaying) {
      engine.stop();
      return;
    }
    startPlayback();
  }, [engine, startPlayback]);

  // Spacebar transport. Ignored while any interactive control is focused so
  // buttons keep their native Space activation.
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const interactive =
        target instanceof HTMLElement &&
        target.closest(
          'button, input, textarea, select, a, [contenteditable="true"], [role="switch"], [role="radio"]',
        ) !== null;

      if (event.code === 'Space' && !interactive && !event.repeat && busy === null) {
        event.preventDefault();
        handlePlayToggle();
      } else if (event.code === 'Escape' && !busy) {
        handleStop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlayToggle, handleStop, busy]);

  // ---- config & presets ----------------------------------------------------
  const updateConfig = useCallback((patch) => {
    setConfig((previous) => normalizeConfig({ ...previous, ...patch }));
    setCustomized(true); // any manual tweak is no longer the saved patch
  }, []);

  const applyPreset = useCallback(
    (id) => {
      const preset = findPreset(id, allPresets);
      if (!preset) {
        setStatus({ text: 'That preset is no longer available.', tone: 'warn' });
        return;
      }
      setConfig(configFromPreset(preset));
      setPresetId(preset.id);
      setCustomized(false);
      setStatus({
        text: `Preset “${preset.name}” loaded — ${MODES.find((m) => m.id === preset.mode)?.label ?? preset.mode}.`,
        tone: 'info',
      });
    },
    [allPresets],
  );

  const changeMode = useCallback(
    (mode) => {
      if (mode === config.mode) return;
      // A clean built-in preset can switch to its mode's signature patch. If
      // the preset was edited/deleted, or a user preset is active, keep the
      // current patch and only switch the synth mode.
      if (!customized && sourceIsBuiltIn) {
        const target = findPreset(MODE_DEFAULT_PRESET[mode], allPresets);
        if (target && target.mode === mode) {
          applyPreset(target.id);
          return;
        }
      }
      updateConfig({ mode });
      setStatus({
        text: `Synth mode: ${MODES.find((m) => m.id === mode)?.label ?? mode}.`,
        tone: 'info',
      });
    },
    [config.mode, customized, sourceIsBuiltIn, allPresets, applyPreset, updateConfig],
  );

  const handleSavePreset = useCallback(
    ({ name, target } = {}) => {
      const cleanName = sanitizePresetName(name);
      if (!cleanName) return { ok: false, error: 'Give the preset a name first.' };

      if (target?.kind === 'builtin') {
        return { ok: false, error: 'Built-in presets are read-only.' };
      }

      const updateId = target?.kind === 'user' ? target.id : null;
      if (isPresetNameTaken(cleanName, presetStore, updateId)) {
        return {
          ok: false,
          error: `The name “${cleanName}” is already taken. Choose a different name.`,
        };
      }

      let nextStore;
      let savedId;

      if (target?.kind === 'user') {
        if (!findPreset(target.id, presetStore.userPresets)) {
          return { ok: false, error: 'That preset no longer exists.' };
        }
        nextStore = updateUserPreset(presetStore, target.id, { name: cleanName, config });
        savedId = target.id;
      } else {
        if (presetStore.userPresets.length >= MAX_USER_PRESETS) {
          return {
            ok: false,
            error: `You can keep up to ${MAX_USER_PRESETS} presets. Delete one first.`,
          };
        }
        nextStore = addUserPreset(presetStore, { name: cleanName, config });
        savedId = nextStore.userPresets[nextStore.userPresets.length - 1].id;
      }

      setPresetStore(nextStore);
      setPresetId(savedId);
      setCustomized(false);

      const stored = persistPresetStore(nextStore);
      const verb = target?.kind === 'user' ? 'Updated preset' : 'Saved preset';
      setStatus({
        text: stored
          ? `${verb} “${cleanName}” — kept in this browser.`
          : `${verb} “${cleanName}” for this session only — browser storage is unavailable.`,
        tone: stored ? 'ok' : 'warn',
      });
      return { ok: true };
    },
    [config, presetStore],
  );

  const handleDeletePreset = useCallback(
    (id) => {
      const preset = findPreset(id, presetStore.userPresets);
      if (!preset) {
        setStatus({ text: 'That user preset no longer exists.', tone: 'warn' });
        return;
      }

      const nextStore = deleteUserPreset(presetStore, id);
      setPresetStore(nextStore);
      const stored = persistPresetStore(nextStore);

      if (presetId === id) {
        setPresetId(null);
        setCustomized(true);
      }

      const storageHint = stored
        ? ''
        : ' Browser storage is unavailable, so this lasts for the session.';
      setStatus({
        text: `Deleted preset “${preset.name}”.${storageHint}`,
        tone: stored ? 'info' : 'warn',
      });
    },
    [presetId, presetStore],
  );

  const handleExportPresets = useCallback(() => {
    if (presetStore.userPresets.length === 0) {
      setStatus({ text: 'Save a preset first, then export the file.', tone: 'warn' });
      return;
    }

    const bundle = createPresetBundle(presetStore.userPresets);
    const filename = presetBundleFilename();
    downloadBlob(
      new Blob([serializePresetBundle(bundle)], { type: 'application/json' }),
      filename,
    );
    setStatus({
      text: `Exported ${presetStore.userPresets.length} preset${
        presetStore.userPresets.length === 1 ? '' : 's'
      } to ${filename}.`,
      tone: 'ok',
    });
  }, [presetStore.userPresets]);

  const handleImportPresets = useCallback(
    async (file) => {
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        setStatus({ text: 'Backup is too large (max 256 KB).', tone: 'error' });
        return;
      }

      let rawText;
      try {
        rawText = await file.text();
      } catch {
        setStatus({ text: 'Could not read that file.', tone: 'error' });
        return;
      }

      const parsed = parsePresetBundle(rawText);
      if (!parsed.ok) {
        setStatus({ text: parsed.error, tone: 'error' });
        return;
      }

      const merged = mergePresetBundle(presetStore, parsed.presets);
      setPresetStore(merged.store);
      const stored = merged.imported > 0 ? persistPresetStore(merged.store) : true;

      const details = [];
      if (merged.skippedDuplicate > 0) {
        details.push(
          `${merged.skippedDuplicate} name${merged.skippedDuplicate === 1 ? '' : 's'} already in use`,
        );
      }
      if (merged.skippedInvalid > 0) {
        details.push(
          `${merged.skippedInvalid} entr${merged.skippedInvalid === 1 ? 'y was' : 'ies were'} invalid`,
        );
      }
      if (merged.limitReached) details.push(`the ${MAX_USER_PRESETS}-preset limit was reached`);
      const reasonText = details.length > 0 ? ` (${details.join('; ')})` : '';

      if (merged.imported === 0) {
        setStatus({
          text:
            parsed.presets.length === 0
              ? 'No presets found in that file.'
              : `No presets imported${reasonText}.`,
          tone: 'warn',
        });
        return;
      }

      const storageText = stored
        ? ''
        : ' Browser storage is unavailable, so these last for the session.';
      setStatus({
        text: `Imported ${merged.imported} preset${merged.imported === 1 ? '' : 's'}${reasonText}.${storageText}`,
        tone: stored ? 'ok' : 'warn',
      });
    },
    [presetStore],
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

  const handleExportZip = useCallback(async () => {
    if (busy !== null) return;
    engine.stop();
    setBusy('zip');
    setStatus({ text: 'Rendering 5 single-character blips offline…', tone: 'info' });
    try {
      const items = await engine.exportBlipPack(config);
      const files = await Promise.all(
        items.map(async (item) => ({
          name: item.name,
          data: new Uint8Array(await item.blob.arrayBuffer()),
        })),
      );
      const blob = createZipBlob(files);
      const filename = 'bliptalk-blip-pack.zip';
      downloadBlob(blob, filename);
      setStatus({
        text: `Saved ${filename} — ${items.length} blips (${items
          .map((item) => item.label)
          .join(', ')}), ${formatBytes(blob.size)} total.`,
        tone: 'ok',
      });
    } catch (error) {
      setStatus({ text: `ZIP export failed: ${error.message}`, tone: 'error' });
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
            estimatedDuration={estimatedDuration}
          />
        </div>

        <ControlsPanel config={config} mode={config.mode} onChange={updateConfig} />

        <PresetBar
          builtIns={PRESETS}
          userPresets={presetStore.userPresets}
          activeId={customized ? null : presetId}
          sourcePreset={sourcePreset}
          onApply={applyPreset}
          onSave={handleSavePreset}
          onDelete={handleDeletePreset}
          onExportPresets={handleExportPresets}
          onImportPresets={handleImportPresets}
        />

        <ActionBar
          isPlaying={isPlaying}
          busy={busy}
          canSpeak={canSpeak}
          status={status}
          onPlay={startPlayback}
          onStop={handleStop}
          onExportWav={handleExportWav}
          onExportPack={handleExportPack}
          onExportZip={handleExportZip}
        />

        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">
          <span>Web Audio API · no samples · nothing leaves your browser · v{APP_VERSION}</span>
          <span>
            <kbd className="border border-slate-700 px-1">Space</kbd> play ·{' '}
            <kbd className="border border-slate-700 px-1">Esc</kbd> stop
          </span>
        </footer>
      </div>
    </div>
  );
}
