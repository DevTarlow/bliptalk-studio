/**
 * BlipTalk Studio — text analysis & intonation rules.
 *
 * `analyzeText()` is the single source of truth for *what* the voice says and
 * *when*. Live playback and OfflineAudioContext export both consume the same
 * event list, which is what guarantees an exported WAV is identical to what
 * you just heard.
 *
 * Every event is a plain object describing one character's worth of speech:
 *
 *   {
 *     index,       // index in the source text (code-point index, for highlighting)
 *     char,        // the character itself
 *     speak,       // false for whitespace / pauses
 *     start,       // seconds from the beginning of the line
 *     duration,    // seconds the character occupies on the timeline
 *     advance,     // duration + inter-character gap + punctuation pause
 *     pauseAfter,  // extra silence caused by punctuation (seconds)
 *     pitch,       // final frequency in Hz (base + jitter + intonation)
 *     pitchFrom,   // frequency the note glides *from* (punctuation only)
 *     glide,       // glide time in seconds (0 = no glide)
 *     gain,        // per-character gain 0..1
 *     rate,        // playbackRate hint for the Animalese buffer slices
 *     vowel,       // 'A' | 'E' | 'I' | 'O' | 'U' — which formant slice to play
 *     consonant,   // null | 'plosive' | 'fricative' — leading noise burst
 *     bufferOffset,// where to start inside the vowel buffer (0..1)
 *   }
 */

/** Fallback patch — every field the synth understands, with sane defaults. */
export const DEFAULT_CONFIG = {
  mode: 'chiptune', // 'chiptune' | 'animalese' | 'robotic'
  basePitch: 440, // Hz, 100..1200
  speed: 55, // ms per character, 10..150
  jitter: 24, // Hz of random pitch variation, 0..200
  decay: 110, // ms envelope decay (mode A/C), 15..900
  volume: 0.8, // 0..1
  waveform: 'square', // 'square' | 'triangle' | 'sawtooth' | 'sine' | 'noise'
  punctuation: true, // apply intonation + pauses
  voiceCharacter: 1.0, // formant scale (Animalese) / crush amount (Robotic)
};

export const MODE_IDS = ['chiptune', 'animalese', 'robotic'];

export const WAVEFORMS = ['square', 'triangle', 'sawtooth', 'sine', 'noise'];

/**
 * Punctuation intonation table.
 *
 * `pitch` is the Hz offset applied to the punctuation's own blip — the spec
 * values are `?` = +150 Hz and `!` = +100 Hz; `.` and `,` drop slightly.
 * `glide` is how long (seconds) the note takes to slide into the target, which
 * is what makes the lift audible rather than just "a higher blip".
 * `pauseScale`/`minPause` define the following silence, in ticks and ms.
 */
export const PUNCTUATION = {
  '?': { pitch: 150, pauseScale: 4.5, minPause: 260, glide: 0.07 },
  '!': { pitch: 100, pauseScale: 4.0, minPause: 230, glide: 0.055 },
  '.': { pitch: -45, pauseScale: 4.0, minPause: 220, glide: 0.06 },
  ',': { pitch: -30, pauseScale: 2.6, minPause: 140, glide: 0.04 },
  ';': { pitch: -28, pauseScale: 3.0, minPause: 160, glide: 0.04 },
  ':': { pitch: -28, pauseScale: 3.0, minPause: 160, glide: 0.04 },
  '…': { pitch: -60, pauseScale: 6.0, minPause: 340, glide: 0.08 },
  '—': { pitch: -40, pauseScale: 3.5, minPause: 200, glide: 0.05 },
  '-': { pitch: -20, pauseScale: 2.0, minPause: 110, glide: 0.035 },
  ')': { pitch: -35, pauseScale: 2.6, minPause: 150, glide: 0.04 },
  '(': { pitch: 35, pauseScale: 1.6, minPause: 90, glide: 0.03 },
  '"': { pitch: 20, pauseScale: 1.8, minPause: 100, glide: 0.03 },
  "'": { pitch: 15, pauseScale: 1.2, minPause: 60, glide: 0.02 },
};

/**
 * Which vowel formant each letter borrows. This is the classic "Animalese"
 * trick: consonants are voiced through a related vowel and prefixed with a
 * short noise burst, so 26 letters still read as 26 distinct sounds.
 */
const LETTER_VOWEL = {
  a: 'A', b: 'E', c: 'E', d: 'E', e: 'E', f: 'E', g: 'E', h: 'A', i: 'I',
  j: 'A', k: 'A', l: 'E', m: 'E', n: 'E', o: 'O', p: 'E', q: 'U', r: 'A',
  s: 'E', t: 'E', u: 'U', v: 'E', w: 'U', x: 'E', y: 'I', z: 'E',
};

const PLOSIVES = new Set(['b', 'c', 'd', 'g', 'k', 'p', 'q', 't', 'x']);
const FRICATIVES = new Set(['f', 'h', 'j', 's', 'v', 'w', 'z']);

/** Relative playbackRate per vowel — `I`/`E` chirp up, `O`/`U` settle down. */
const VOWEL_RATE = { A: 1.0, E: 1.07, I: 1.15, O: 0.93, U: 0.87 };

/**
 * Animalese pitch mapping.
 *
 * The vowel bank is synthesised at a fixed 120 Hz, so a letter's perceived
 * pitch is `playbackRate × 120 Hz`. Anchoring the rate to the absolute Base
 * Pitch slider (rather than to a ratio) is what lets one slider sweep the voice
 * from a growling bear at 100 Hz to a fairy at 1.2 kHz — and because
 * playbackRate moves the formants too, that sweep sounds like a *character*
 * change rather than a tape-speed change.
 */
export const VOICE_RATE_REFERENCE = 275; // Hz base pitch that maps to rate 1.0
export const RATE_BOUNDS = { min: 0.35, max: 3.6 };

const MIN_PITCH = 40;
const MAX_PITCH = 8000;
const MAX_EVENTS = 4000; // guard against someone pasting a novel into a blip synth

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return n < min ? min : n > max ? max : n;
}

/** Clamp + fill a user config so the engine can trust every field. */
export function normalizeConfig(config = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return {
    ...merged,
    mode: MODE_IDS.includes(merged.mode) ? merged.mode : DEFAULT_CONFIG.mode,
    basePitch: clamp(merged.basePitch, 100, 1200),
    speed: clamp(merged.speed, 10, 150),
    jitter: clamp(merged.jitter, 0, 200),
    decay: clamp(merged.decay, 15, 900),
    volume: clamp(merged.volume, 0, 1),
    waveform: WAVEFORMS.includes(merged.waveform) ? merged.waveform : DEFAULT_CONFIG.waveform,
    punctuation: merged.punctuation !== false,
    voiceCharacter: clamp(merged.voiceCharacter, 0.4, 2.4),
  };
}

/** Deterministic PRNG (mulberry32) — same seed, same performance, every time. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — turns a text/config pair into a stable seed. */
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  const str = String(text);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Snap a frequency to the nearest equal-tempered semitone (robotic mode). */
export function quantizeToSemitone(pitch, reference) {
  const ratio = Math.max(1e-6, pitch / Math.max(1e-6, reference));
  const semitones = Math.round(12 * Math.log2(ratio));
  return reference * Math.pow(2, semitones / 12);
}

/**
 * Turn a string into a fully time-stamped performance.
 *
 * @param {string} text
 * @param {object} rawConfig
 * @param {number} [seed] deterministic seed; omit for a fresh performance
 * @returns {{ events: object[], duration: number, config: object, seed: number }}
 */
export function analyzeText(text, rawConfig = {}, seed) {
  const config = normalizeConfig(rawConfig);
  const usedSeed = (seed === undefined || seed === null ? (Math.random() * 0xffffffff) >>> 0 : seed >>> 0);
  const rand = mulberry32(usedSeed);

  const tick = config.speed / 1000; // seconds per character slot
  const gap = tick * 0.14; // breath between blips
  const chars = Array.from(String(text ?? '')).slice(0, MAX_EVENTS);

  const events = [];
  let cursor = 0;
  let previousPitch = config.basePitch;
  let drift = 0; // smoothed random-walk component of the jitter

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    const lower = char.toLowerCase();
    const rule = config.punctuation ? PUNCTUATION[char] : undefined;

    // ---- whitespace: pure timing, no voice -------------------------------
    if (/\s/.test(char)) {
      const isBreak = char === '\n' || char === '\r' || char === '\t';
      const pause = isBreak ? Math.max(0.18, tick * 4) : tick * 0.85;
      events.push(makePause(i, char, cursor, pause));
      cursor += pause;
      continue;
    }

    // ---- jitter: smoothed drift + per-character scatter -------------------
    drift = drift * 0.62 + (rand() * 2 - 1) * 0.38;
    const scatter = (rand() * 2 - 1) * config.jitter * 0.62 + drift * config.jitter * 0.38;

    // ---- intonation -------------------------------------------------------
    let intonation = 0;
    let glide = 0;
    let pauseAfter = 0;
    if (rule) {
      intonation = rule.pitch;
      glide = rule.glide;
      pauseAfter = Math.max(rule.minPause / 1000, tick * rule.pauseScale) - tick;
      if (pauseAfter < 0) pauseAfter = 0;
    }

    let pitch = config.basePitch + scatter + intonation;
    if (config.mode === 'robotic') {
      pitch = quantizeToSemitone(pitch, config.basePitch);
    }
    pitch = clamp(pitch, MIN_PITCH, MAX_PITCH);

    const vowel = LETTER_VOWEL[lower] ?? 'A';
    const isLetter = /[a-z]/i.test(char);
    const isDigit = /[0-9]/.test(char);
    const consonant = isLetter ? (PLOSIVES.has(lower) ? 'plosive' : FRICATIVES.has(lower) ? 'fricative' : null) : null;

    // Absolute pitch slider sets the voice register; jitter + intonation are
    // relative deviations on top of it, per-vowel colour adds character.
    const register = clamp(config.basePitch / VOICE_RATE_REFERENCE, RATE_BOUNDS.min, RATE_BOUNDS.max);
    const rate = clamp(
      (pitch / config.basePitch) * register * (VOWEL_RATE[vowel] ?? 1),
      RATE_BOUNDS.min,
      RATE_BOUNDS.max,
    );

    const duration = tick * (rule ? 1.05 : 0.92);
    const gain = isLetter || isDigit ? 1 : 0.72; // stray symbols blip a little softer

    events.push({
      index: i,
      char,
      speak: true,
      start: cursor,
      duration,
      advance: duration + gap + pauseAfter,
      pauseAfter,
      pitch,
      pitchFrom: glide > 0 ? previousPitch : pitch,
      glide,
      gain,
      rate,
      vowel,
      consonant: isDigit ? 'plosive' : consonant,
      bufferOffset: rand() * 0.22, // start a little way into the vowel for variety
    });

    previousPitch = pitch;
    cursor += duration + gap + pauseAfter;
  }

  const last = events[events.length - 1];
  const voiced = events.some((ev) => ev.speak);

  // Whitespace-only input is not a performance — report it as empty so callers
  // can treat it as a no-op instead of playing a silent timeline.
  if (!voiced) {
    return { events: [], duration: 0, config, seed: usedSeed };
  }

  return { events, duration: last.start + last.advance, config, seed: usedSeed };
}

function makePause(index, char, start, duration) {
  return {
    index,
    char,
    speak: false,
    start,
    duration,
    advance: duration,
    pauseAfter: duration,
    pitch: 0,
    pitchFrom: 0,
    glide: 0,
    gain: 0,
    rate: 1,
    vowel: 'A',
    consonant: null,
    bufferOffset: 0,
  };
}

/** Total timeline length of an analysis, including a little release tail. */
export function analysisDuration(analysis, tail = 0.25) {
  return Math.max(0.05, (analysis?.duration ?? 0) + tail);
}
