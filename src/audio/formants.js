/**
 * BlipTalk Studio — formant & noise voice bank.
 *
 * Animalese is built the cheap way that still sounds right: a bank of five
 * synthesised vowel slices plus two noise bursts. Each letter is then a buffer
 * slice played back at a variable `playbackRate`, which is both authentic to
 * the Animal Crossing trick and far cheaper than running a formant filter bank
 * per character.
 *
 * Everything here is generated with plain sample math — no wavetables, no
 * assets, no dependencies — so the whole app stays a single HTML5 bundle.
 */

/** Formant chart (centre Hz, relative gain, bandwidth Hz) for the five vowels. */
export const VOWEL_FORMANTS = {
  A: { freqs: [730, 1090, 2440], gains: [1.0, 0.5, 0.16], bw: [110, 130, 180] },
  E: { freqs: [530, 1840, 2480], gains: [1.0, 0.45, 0.2], bw: [100, 140, 190] },
  I: { freqs: [270, 2290, 3010], gains: [1.0, 0.35, 0.22], bw: [90, 150, 200] },
  O: { freqs: [570, 840, 2410], gains: [1.0, 0.6, 0.12], bw: [100, 120, 180] },
  U: { freqs: [300, 870, 2240], gains: [1.0, 0.4, 0.1], bw: [90, 120, 170] },
};

export const VOWEL_KEYS = Object.keys(VOWEL_FORMANTS);
export const VOICE_F0 = 120; // Hz the bank is synthesised at, before playbackRate
const VOWEL_DURATION = 0.34; // seconds of buffer per vowel
const PEAK = 0.92; // normalisation target — leaves headroom for polyphony

/**
 * How the waveform selector colours the Animalese voice bank.
 * A square-ish glottal source is bright and buzzy, a sine is soft and pure.
 */
export const WAVEFORM_BRIGHTNESS = {
  square: 1,
  triangle: 0.82,
  sawtooth: 1.3,
  sine: 0.58,
  noise: 1.45,
};

/** Deterministic PRNG so a given voice character always sounds the same. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Additive formant synthesis.
 *
 * A glottal source is approximated by a harmonic series with a 1/n^1.15
 * spectral tilt; each harmonic is weighted by the summed resonance of the
 * three formants. Randomising the harmonic phases avoids the impulse-like
 * buzz you get from all-cosine summation and keeps the peak low.
 */
export function createVowelBuffer(ctx, vowel, options = {}) {
  const { formantScale = 1, brightness = 1, seed = 1 } = options;
  const spec = VOWEL_FORMANTS[vowel] ?? VOWEL_FORMANTS.A;
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * VOWEL_DURATION));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const random = rng(seed + vowel.charCodeAt(0) * 977);

  const nyquist = sampleRate * 0.45;
  const partials = [];
  for (let n = 1; n * VOICE_F0 < Math.min(5200, nyquist); n += 1) {
    const harmonic = n * VOICE_F0;
    let resonance = 0;
    for (let k = 0; k < spec.freqs.length; k += 1) {
      const centre = spec.freqs[k] * formantScale;
      const bandwidth = spec.bw[k] * (0.7 + formantScale * 0.3);
      const detune = (harmonic - centre) / bandwidth;
      resonance += spec.gains[k] / (1 + detune * detune);
    }
    const amplitude = resonance / Math.pow(n, 1.15) * brightness;
    if (amplitude > 0.002) {
      partials.push({
        freq: harmonic,
        amp: amplitude,
        phase: random() * Math.PI * 2,
      });
    }
  }

  const attack = 0.012;
  const releaseStart = VOWEL_DURATION * 0.55;
  const tailFadeSamples = Math.max(1, Math.floor(0.004 * sampleRate));
  const twoPi = Math.PI * 2;
  let peak = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    for (let p = 0; p < partials.length; p += 1) {
      const partial = partials[p];
      sample += partial.amp * Math.sin(twoPi * partial.freq * t + partial.phase);
    }

    // Amplitude envelope: fast attack, gentle decay to a sustain, soft release.
    let env;
    if (t < attack) {
      env = t / attack;
    } else {
      env = 0.62 + 0.38 * Math.exp(-(t - attack) * 9);
    }
    if (t > releaseStart) {
      env *= Math.exp(-(t - releaseStart) / ((VOWEL_DURATION - releaseStart) * 0.36));
    }
    // Sample-exact fade to zero across the final milliseconds, so the buffer can
    // be cut or looped anywhere in this window without a discontinuity.
    const fromEnd = length - 1 - i;
    if (fromEnd < tailFadeSamples) env *= fromEnd / tailFadeSamples;

    const value = sample * env;
    data[i] = value;
    const abs = value < 0 ? -value : value;
    if (abs > peak) peak = abs;
  }

  const scale = peak > 0 ? PEAK / peak : 1;
  for (let i = 0; i < length; i += 1) data[i] *= scale;

  return buffer;
}

/**
 * One-pole filter coefficients (cheap, stable, good enough for noise shaping).
 * @param {number} cutoff Hz
 * @param {number} sampleRate
 */
function onePole(cutoff, sampleRate) {
  const x = Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  return 1 - x;
}

/**
 * Shaped noise buffers.
 *
 * - `plosive`   — 55 ms low-passed thump (b, d, g, k, p, t…)
 * - `fricative` — 100 ms high-passed hiss (f, s, sh, z…)
 * - `white`     — 1 s of raw noise, looped for the NES-style noise channel
 *                 and the robotic static layer
 */
export function createNoiseBuffer(ctx, kind = 'white', options = {}) {
  const { seed = 7 } = options;
  const sampleRate = ctx.sampleRate;
  const random = rng(seed + kind.length * 131);
  const duration = kind === 'plosive' ? 0.055 : kind === 'fricative' ? 0.1 : 1;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const lpCoeff = onePole(kind === 'plosive' ? 1500 : 2600, sampleRate);
  const hpCoeff = onePole(kind === 'fricative' ? 2600 : 180, sampleRate);
  let low = 0;
  let lowForHigh = 0;
  let peak = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const noise = random() * 2 - 1;

    low += lpCoeff * (noise - low);
    lowForHigh += hpCoeff * (noise - lowForHigh);
    let sample;
    if (kind === 'fricative') {
      sample = noise - lowForHigh; // high-passed hiss
    } else if (kind === 'plosive') {
      sample = low; // low-passed body
    } else {
      sample = noise;
    }

    // Envelope shaping: plosives snap, fricatives breathe, white stays flat.
    let env = 1;
    if (kind === 'plosive') env = Math.exp(-t * 62);
    else if (kind === 'fricative') env = Math.min(1, t / 0.006) * Math.exp(-t * 24);

    const value = sample * env;
    data[i] = value;
    const abs = value < 0 ? -value : value;
    if (abs > peak) peak = abs;
  }

  if (kind !== 'white' && peak > 0) {
    const scale = 0.85 / peak;
    for (let i = 0; i < length; i += 1) data[i] *= scale;
  } else {
    const scale = 0.5;
    for (let i = 0; i < length; i += 1) data[i] *= scale;
  }

  return buffer;
}

/**
 * Build the complete voice bank for a context.
 *
 * @param {BaseAudioContext} ctx live *or* OfflineAudioContext
 * @param {{ formantScale?: number, seed?: number }} [options]
 */
export function createVoiceBank(ctx, options = {}) {
  const { formantScale = 1, seed = 1 } = options;
  const vowels = {};
  for (let i = 0; i < VOWEL_KEYS.length; i += 1) {
    const key = VOWEL_KEYS[i];
    vowels[key] = createVowelBuffer(ctx, key, { formantScale, seed });
  }
  return {
    vowels,
    plosive: createNoiseBuffer(ctx, 'plosive', { seed }),
    fricative: createNoiseBuffer(ctx, 'fricative', { seed }),
    white: createNoiseBuffer(ctx, 'white', { seed }),
  };
}
