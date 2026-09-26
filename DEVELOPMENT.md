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
embed size: **900 × 720** (the UI caps itself at 900 px wide and stacks below
that).

The zip is gitignored on purpose — it's a build artifact, regenerate it any
time.

---

## Architecture

```
src/
  audio/
    SynthEngine.js   AudioContext/OfflineAudioContext, scheduling, three voices, export
    intonation.js    analyzeText(): text → time-stamped event list, punctuation rules, config clamping
    formants.js      Vowel formant synthesis + shaped noise buffers (the "voice bank")
    wav.js           Inline 16-bit LPCM WAV encoder with TPDF dither
    presets.js       Modes, presets, blip-pack definitions (pure data)
  components/
    TopBar · DialogBox · Scope · ScriptPanel · ControlsPanel
    Slider · Toggle · WaveSelect · WaveGlyph · PresetBar · ActionBar · iconData
  utils/download.js  Blob → file download
  App.jsx            State, hotkeys, autoplay unlock, export flows
scripts/selftest.mjs 34 headless assertions over the DSP/WAV/intonation core
```

Three design decisions worth knowing before you edit:

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
npm test    # 34 assertions: intonation maths, WAV byte layout, curves, formants
```

Covers `?`/`!`/`.`/`,` pitch and pause rules, jitter bounds and seed
determinism, timeline monotonicity, vowel distinctness and peak normalisation
(−0 dBFS click-free tails), WAV header field-by-field layout with a
decode-back error bound, limiter transparency, bitcrush staircase, and config
clamping at the slider extremes. Runs in plain Node with a stubbed
`AudioBuffer`, seconds to run, no browser required.

Browser-only behaviour was verified separately against Chromium: live playback
produces real signal (checked by reading the `AnalyserNode`-fed visualiser
canvas), the typewriter highlight tracks the audio clock, and every export path
was downloaded and byte-inspected (RIFF layout, sample rate, peak, duration,
non-silence, five distinct blips).

## Browser support

Needs `AudioContext` + `OfflineAudioContext`: Chrome/Edge 57+, Firefox 52+,
Safari 14.1+. iOS Safari requires the first tap before audio starts, which the
badge prompts for.

## License

MIT.
