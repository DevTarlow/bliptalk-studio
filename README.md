# BlipTalk Studio

A browser-based retro dialogue sound generator for indie game developers. Type a
line, pick a voice, and export game-ready WAV files — chiptune blips, Animalese
phoneme speech, or bitcrushed robot static.

Built with React + Vite + Tailwind CSS on the **pure Web Audio API**. No audio
libraries, no samples, no server: every sound is synthesised from maths in your
browser, and nothing you type ever leaves the page.

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

---

## The three voices

| Mode | Synthesis |
| --- | --- |
| **8-Bit Chiptune** | NES/Game Boy style oscillator blips. Square, triangle, sawtooth or sine carriers, or a band-passed noise channel. |
| **Animalese** | Five additively-synthesised vowel formants (A, E, I, O, U) plus low-passed plosive thumps and high-passed fricative hisses. One letter = one buffer slice at a variable `playbackRate`. |
| **Retro Noise/Robotic** | Square carrier + sub-octave through bipolar ring modulation, a bitcrush quantiser and a noise-static layer, band-limited to a "telephone" range. |

### Intonation rules

With **Punctuation Intonation** enabled, `analyzeText()` stamps each character
with a pitch offset and a pause:

| Character | Pitch | Pause after |
| --- | --- | --- |
| `?` | **+150 Hz** (with a short glide up) | ≥ 260 ms |
| `!` | **+100 Hz** (with a short glide up) | ≥ 230 ms |
| `.` | −45 Hz | ≥ 220 ms |
| `,` | −30 Hz | ≥ 140 ms |
| `;` `:` | −28 Hz | ≥ 160 ms |
| `…` | −60 Hz | ≥ 340 ms |

Letters get a smoothed random-walk pitch jitter (the *Pitch Variation* slider,
0–200 Hz) and every event is scheduled on a strict timeline, so the gaps are
sample-accurate rather than `setTimeout`-approximate.

## Controls

| Control | Range | Notes |
| --- | --- | --- |
| Base Pitch | 100–1200 Hz | Chiptune/robotic: carrier frequency. Animalese: voice register (drives `playbackRate`, so formants shift with it). |
| Speed / Interval | 10–150 ms per letter | 150 ms ≈ 7 letters/sec, 10 ms ≈ 100. |
| Pitch Variation | 0–200 Hz | Per-character random jitter. |
| Volume | 0–100 % | Applied on the master bus, live-adjustable during playback. |
| Envelope Decay | 15–900 ms | Blip note length (staccato → smooth). Capped by the character slot so fast text can't turn to mud. |
| Formant / Crush | 0.40–2.40 | Scales vowel formants in Animalese, sets quantiser grit in Robotic. |
| Waveform | square / triangle / sawtooth / sine / noise | Carrier shape; in Animalese it sets vowel brightness. |
| Punctuation Intonation | on/off | When off, punctuation neither shifts pitch nor adds pauses. |

**Presets:** Cozy Animal · Sarcastic Robot · 8-Bit Hero · Dark Wizard · Fairy
Whispers. Loading a preset also switches its synth mode; moving any slider marks
the patch as *custom*.

**Hotkeys:** `Space` play/stop (ignored while typing) · `Esc` stop.

## Exports

- **Export WAV File** → `dialogue_blip.wav`, mono 16-bit LPCM at the browser's
  sample rate (44.1 or 48 kHz).
- **Export Blip Pack** → five distinct single-character blips for engine
  triggering. Chiptune/robotic modes get a pentatonic scale
  (`blip_1_root` … `blip_5_sixth`); Animalese gets the five vowels
  (`blip_1_a` … `blip_5_u`). Browsers may ask you to allow multiple downloads.

Exports render through an `OfflineAudioContext` using the **same**
`scheduleVoice()` routine and the **same** `analyzeText()` performance as live
playback, at the same sample rate — so a file is exactly what you heard. Jitter
is seeded from a hash of the text + patch, which makes repeat exports of the
same line byte-identical.

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

MIT — do whatever you like with the blips.
