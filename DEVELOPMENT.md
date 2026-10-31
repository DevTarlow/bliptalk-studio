# Development notes

Internal notes for building, testing and shipping BlipTalk Studio.
The user-facing guide lives in [README.md](README.md).

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Headless audio-core tests (`node scripts/selftest.mjs`) |
| `npm run lint` | Oxlint |
| `npm run check` | Lint + tests |
| `npm run package:itch` | Build and zip `dist/` for itch.io upload |

## Deploying to itch.io

```bash
npm run package:itch
```

Upload `bliptalk-studio-itch.zip` as an **HTML** project. `index.html` sits at
the zip root, and `vite.config.js` sets `base: './'` so all asset URLs stay
relative — required because itch.io serves games from
`https://html.itch.zone/html/<id>/` rather than a domain root. Recommended
embed size: **900 × 900** (the UI caps itself at 900 px wide and stacks below
that). The 1.1.0 layout measures about 885 px tall at 900 px wide; the old 840
viewport will show a scrollbar. Saved presets wrap in the Presets bar, so a
browser with several user presets grows taller and the embed scrolls. Update the
live itch.io embed height when the new build is uploaded.

The zip is gitignored on purpose — it's a build artifact, regenerate it any
time. The script removes the old archive first; without that, `zip` updates an
existing archive in place and can leave stale hashed assets from an earlier
build.

---

## Architecture

```
src/
  audio/
    SynthEngine.js   AudioContext/OfflineAudioContext, scheduling, three voices, export
    intonation.js    analyzeText(): text → time-stamped event list, punctuation rules, config clamping
    formants.js      Vowel formant synthesis + shaped noise buffers (the "voice bank")
    wav.js           Inline 16-bit LPCM WAV encoder with TPDF dither
    presets.js       Modes, stock presets, blip-pack definitions (pure data)
    presetStore.js   Persisted user presets, name/id sanitisation (built-ins are read-only)
    presetTransfer.js Portable preset bundles: JSON export/import, merge rules
    workspaceStore.js Last voice state (localStorage) + tab draft (sessionStorage)
  components/
    TopBar · DialogBox · Scope · ScriptPanel · ControlsPanel
    Slider · Toggle · WaveSelect · WaveGlyph · PresetBar · SavePresetForm · ActionBar · iconData
  utils/
    download.js      Blob → file download
    numericInput.js  Typed slider values: parse, clamp and snap to the step grid
    zip.js           Store-only ZIP writer for the one-file blip pack
  version.js         Visible app version, checked against package.json
  App.jsx            State, hotkeys, autoplay unlock, preset transitions, export flows
scripts/selftest.mjs 69 headless assertions over the DSP/WAV/intonation/preset/transfer/workspace/ZIP core
```

Seven design decisions worth knowing before you edit:

1. **One event list drives everything.** `analyzeText()` returns a plain array of
   `{index, char, start, duration, pitch, glide, rate, vowel, consonant, …}`.
   Live playback and offline export both walk that array, so they cannot drift
   apart. Timing lives in the analysis, not in the scheduler.
2. **Scheduling is Web Audio, not `setTimeout`.** Lines under 25 s are scheduled
   in one shot into the future (immune to background-tab timer throttling);
   longer lines roll forward on a 350 ms lookahead window. `setTimeout` is only
   used for the UI highlight, which reads `ctx.currentTime` and therefore stays
   locked to the audio clock.
3. **A transparent soft limiter, not a compressor.** The master bus runs through
   a waveshaper that is bit-exact identity below ±0.7 and saturates smoothly
   above it, so overlapping blips never clip and a single quiet blip is
   untouched.
4. **Built-in presets are fixed; only user presets are stored.**
   `PRESETS` in `presets.js` is the immutable stock library.
   `presetStore.js` persists only `userPresets` under
   `bliptalk-studio:presets:v1`, sanitises names/ids/patches on load, and ignores
   legacy `builtInOverrides` / `deletedBuiltIns` keys from earlier builds.
   `resolvePresets()` returns the fixed built-ins followed by user presets. App
   tracks the applied `presetId` separately from a `customized` flag, so a clean
   built-in can auto-load a mode default while a hand-tuned patch is never
   replaced. Saving from a built-in always creates a user preset; Update only
   appears for one of the user's own presets.
5. **Workspace state is split by sensitivity.** The voice config and source
   preset live in `localStorage` under `bliptalk-studio:workspace:v1`; the typed
   line lives in `sessionStorage` under `bliptalk-studio:draft:v1`. The line can
   be unreleased story text, and itch.io serves HTML games from a shared origin,
   so it is tab-scoped. Both stores are sanitised on read and fail independently.
6. **Preset import is merge-only.** `presetTransfer.js` exports only user
   presets, regenerates IDs on import, skips duplicate and built-in names, and
   stops at the 40-preset cap. It never overwrites or deletes an existing preset.
7. **The ZIP pack is store-only.** `zip.js` writes a classic 32-bit archive
   with no compression and no dependency. The WAVs are already large and
   little-compressible, and the five-file export remains available unchanged.

The main transport is a restart, not a stop: when a line is playing the primary
button calls `startPlayback`, which stops the old take before setting the new
playing state. The Spacebar still toggles play/stop. Making `startPlayback`
stop first matters because the old performance's `onEnd('stopped')` callback
runs synchronously and would otherwise flip the new one back to "not playing".

Every preset store read/write is wrapped so a blocked or full storage degrades
to session-only data with a status warning rather than a crash. Workspace
autosave is best-effort and silent; a missing draft simply falls back to the
default line on the next load.

### Which controls apply to which mode

Easy to trip over when editing: two controls are mode-specific by design.

| Control | Chiptune | Animalese | Robotic |
| --- | --- | --- | --- |
| Base Pitch | carrier Hz | voice register (`playbackRate`) | carrier Hz |
| Speed | ✓ | ✓ (also sets blip length) | ✓ |
| Pitch Variation | ✓ | ✓ (via `playbackRate`) | ✓ |
| Envelope Decay | ✓ | — *(length follows Speed)* | ✓ |
| Formant / Crush | — | formant scale | quantiser grit |
| Waveform | carrier shape | vowel brightness | carrier shape |

### Autoplay policy

Creating an `AudioContext` without a gesture leaves it `suspended`. The engine
creates it lazily, resumes it on the first `pointerdown`/`keydown`/`touchstart`
(and again on Play), and the header badge reports the real state: *Click to
enable audio* → *Audio ready*.

---

## Testing

```bash
npm test    # 69 assertions: intonation, WAV, curves, formants, typed values, presets, transfer, workspace, ZIP, version
```

Covers `?`/`!`/`.`/`,` pitch and pause rules, jitter bounds and seed
determinism, timeline monotonicity, vowel distinctness and peak normalisation
(−0 dBFS click-free tails), WAV header field-by-field layout with a
decode-back error bound, limiter transparency, bitcrush staircase, config
clamping at the slider extremes, typed slider parsing/step snapping, the user
preset store (add/update/delete, stock names reserved, name collisions, legacy
built-in key handling, localStorage round-trips and corrupt/failing storage),
preset bundle parsing/merging, workspace hydration and storage failure, the
ZIP writer's CRC/headers/central directory/round-trip, and the version constant.
Runs in plain Node with a stubbed `AudioBuffer`, seconds to run, no browser
required.

Browser-only behaviour was verified separately against Chromium: live playback
produces real signal (checked by reading the `AnalyserNode`-fed visualiser
canvas), the typewriter highlight tracks the audio clock, every export path was
downloaded and byte-inspected (RIFF layout, sample rate, peak, duration,
non-silence, five distinct blips), and the 1.1.0 UI was exercised with a
headless browser: save preset, autosave/reload restore, restart, and ZIP export.

## Release checklist

1. `npm run check` and `npm run build`.
2. Run the browser QA pass and `npm run package:itch`.
3. Update `CHANGELOG.md`, `README.md`, `DEVELOPMENT.md`, and `ITCH.md`.
4. Confirm `ITCH.md`'s description matches the live page plus the approved
   insertions, and the v1.1.0 devlog draft is ready.
5. Upload the zip, update the itch embed height to 900, paste the description,
   and publish the devlog.
6. Tag `v1.1.0` after the release commit is verified; push the tag.

## Browser support

Needs `AudioContext` + `OfflineAudioContext`: Chrome/Edge 57+, Firefox 52+,
Safari 14.1+. iOS Safari requires the first tap before audio starts, which the
badge prompts for.

## License

MIT.
