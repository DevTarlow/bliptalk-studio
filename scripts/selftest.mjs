/**
 * BlipTalk Studio — headless self-test for the audio core.
 *
 *   node scripts/selftest.mjs
 *
 * Covers everything that does not need a real AudioContext: text analysis /
 * intonation rules, the WAV encoder byte layout, the limiter and bitcrush
 * curves, and the formant synthesis maths (driven by a tiny AudioBuffer stub).
 * Browser-only behaviour (actual rendering, playback) is verified separately.
 */

import assert from 'node:assert/strict';
import {
  analyzeText,
  DEFAULT_CONFIG,
  hashSeed,
  mulberry32,
  normalizeConfig,
  quantizeToSemitone,
  RATE_BOUNDS,
} from '../src/audio/intonation.js';
import { encodeWavBytes, formatBytes, peakAmplitude } from '../src/audio/wav.js';
import { createVowelBuffer, createNoiseBuffer, VOWEL_KEYS } from '../src/audio/formants.js';
import { makeBitcrushCurve, makeSoftClipCurve } from '../src/audio/SynthEngine.js';
import { NOTE_BLIP_PACK, PRESETS, presetConfig } from '../src/audio/presets.js';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  \u001b[32m✓\u001b[0m ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  \u001b[31m✗\u001b[0m ${name}\n      ${error.message}`);
  }
}

function section(title) {
  console.log(`\n\u001b[36m${title}\u001b[0m`);
}

/** Minimal AudioBuffer stand-in — enough for the DSP under test. */
function stubContext(sampleRate = 44100) {
  return {
    sampleRate,
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        duration: length / rate,
        getChannelData: (c) => data[c],
      };
    },
  };
}

// ---------------------------------------------------------------------------
section('WAV encoder');

test('writes a canonical 44-byte RIFF/WAVE header', () => {
  const ctx = stubContext(44100);
  const buffer = ctx.createBuffer(1, 4410, 44100);
  buffer.getChannelData(0)[0] = 0.5;

  const bytes = encodeWavBytes(buffer);
  const view = new DataView(bytes);
  const ascii = (o, n) => String.fromCharCode(...new Uint8Array(bytes, o, n));

  assert.equal(ascii(0, 4), 'RIFF');
  assert.equal(ascii(8, 4), 'WAVE');
  assert.equal(ascii(12, 4), 'fmt ');
  assert.equal(ascii(36, 4), 'data');
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8, 'RIFF size');
  assert.equal(view.getUint32(16, true), 16, 'fmt chunk size');
  assert.equal(view.getUint16(20, true), 1, 'PCM format tag');
  assert.equal(view.getUint16(22, true), 1, 'mono');
  assert.equal(view.getUint32(24, true), 44100, 'sample rate');
  assert.equal(view.getUint16(32, true), 2, 'block align');
  assert.equal(view.getUint16(34, true), 16, 'bit depth');
  assert.equal(view.getUint32(28, true), 44100 * 2, 'byte rate');
  assert.equal(view.getUint32(40, true), 4410 * 2, 'data size');
  assert.equal(bytes.byteLength, 44 + 4410 * 2);
});

test('round-trips sample values within dither tolerance', () => {
  const ctx = stubContext(8000);
  const frames = 256;
  const buffer = ctx.createBuffer(1, frames, 8000);
  const source = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) source[i] = Math.sin((i / frames) * Math.PI * 4) * 0.8;

  const bytes = encodeWavBytes(buffer);
  const view = new DataView(bytes);
  let worst = 0;
  for (let i = 0; i < frames; i += 1) {
    const decoded = view.getInt16(44 + i * 2, true) / 32768;
    worst = Math.max(worst, Math.abs(decoded - source[i]));
  }
  assert.ok(worst < 2 / 32768, `max error ${worst} should be under 2 LSB`);
});

test('interleaves stereo channels and clamps out-of-range input', () => {
  const ctx = stubContext(8000);
  const buffer = ctx.createBuffer(2, 4, 8000);
  buffer.getChannelData(0).set([0, 0, 0, 0]);
  buffer.getChannelData(1).set([1, -1, 3, -3]); // 3 / -3 must clamp

  const bytes = encodeWavBytes(buffer);
  const view = new DataView(bytes);
  assert.equal(new DataView(bytes).getUint16(22, true), 2, 'stereo');
  assert.equal(bytes.byteLength, 44 + 4 * 4);
  // Dither moves the exact rail value by up to 1 LSB, so assert "within an LSB
  // of the rail" and — the part that actually matters — that nothing wraps.
  // Interleaved byte offsets: 44 + (frame * channels + channel) * 2
  const at = (frame, channel) => view.getInt16(44 + (frame * 2 + channel) * 2, true);
  assert.ok(at(0, 1) >= 32766, `positive rail ${at(0, 1)}`);
  assert.ok(at(1, 1) <= -32767, `negative rail ${at(1, 1)}`);
  assert.ok(at(2, 1) >= 32766, `clamped above ${at(2, 1)}`);
  assert.ok(at(3, 1) <= -32767, `clamped below ${at(3, 1)}`);
  assert.ok(at(2, 1) > 0 && at(3, 1) < 0, 'overflow must not flip sign');
  assert.ok(Math.abs(at(0, 0)) <= 1, 'digital silence stays within dither noise');
});

test('peakAmplitude and formatBytes behave', () => {
  const ctx = stubContext(8000);
  const buffer = ctx.createBuffer(1, 4, 8000);
  buffer.getChannelData(0).set([0.25, -0.9, 0.5, 0]);
  assert.ok(Math.abs(peakAmplitude(buffer) - 0.9) < 1e-6, 'peak'); // Float32 storage
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
});

// ---------------------------------------------------------------------------
section('Intonation & text analysis');

test('? lifts +150 Hz and ! lifts +100 Hz', () => {
  const { events } = analyzeText('a?a!a', { ...DEFAULT_CONFIG, jitter: 0, punctuation: true });
  const pitches = events.filter((e) => e.speak).map((e) => [e.char, Math.round(e.pitch)]);
  const base = DEFAULT_CONFIG.basePitch;
  assert.deepEqual(pitches, [
    ['a', base],
    ['?', base + 150],
    ['a', base],
    ['!', base + 100],
    ['a', base],
  ]);
});

test('. and , drop the pitch slightly', () => {
  const { events } = analyzeText('a.a,a', { ...DEFAULT_CONFIG, jitter: 0 });
  const lookup = Object.fromEntries(events.filter((e) => e.speak).map((e) => [e.char, e.pitch]));
  assert.ok(lookup['.'] < DEFAULT_CONFIG.basePitch, 'period drops');
  assert.ok(lookup[','] < DEFAULT_CONFIG.basePitch, 'comma drops');
  assert.ok(lookup['.'] < lookup[','], 'period drops further than comma');
});

test('punctuation introduces longer pauses than letters', () => {
  const { events } = analyzeText('ab.cd', { ...DEFAULT_CONFIG });
  const letter = events.find((e) => e.char === 'a');
  const period = events.find((e) => e.char === '.');
  const comma = analyzeText('ab,cd', { ...DEFAULT_CONFIG }).events.find((e) => e.char === ',');
  assert.ok(period.advance > 0.2, `period slot ${period.advance} should hold a real sentence pause`);
  assert.ok(comma.advance > 0.1, `comma slot ${comma.advance}`);
  assert.equal(letter.pauseAfter, 0, 'letters do not pause');
  assert.ok(period.advance > comma.advance, 'period holds longer than comma');
  assert.ok(comma.advance > letter.advance, 'comma holds longer than a letter');
});

test('punctuation toggle disables both intonation and extra pauses', () => {
  const { events } = analyzeText('a?a', { ...DEFAULT_CONFIG, jitter: 0, punctuation: false });
  const question = events.find((e) => e.char === '?');
  assert.equal(question.pitch, DEFAULT_CONFIG.basePitch, 'no lift');
  assert.equal(question.pauseAfter, 0, 'no pause');
});

test('punctuation blips glide from the previous pitch', () => {
  const { events } = analyzeText('a?', { ...DEFAULT_CONFIG, jitter: 0 });
  const question = events.find((e) => e.char === '?');
  assert.equal(question.pitchFrom, DEFAULT_CONFIG.basePitch);
  assert.ok(question.glide > 0);
});

test('jitter stays inside the configured band', () => {
  const jitter = 60;
  const { events } = analyzeText('the quick brown fox jumps over the lazy dog', { ...DEFAULT_CONFIG, jitter });
  for (const ev of events) {
    if (!ev.speak || ev.char === '?') continue;
    assert.ok(Math.abs(ev.pitch - DEFAULT_CONFIG.basePitch) <= jitter + 1e-6, `pitch ${ev.pitch}`);
  }
});

test('jitter is zero when the slider is zero', () => {
  const { events } = analyzeText('hello there', { ...DEFAULT_CONFIG, jitter: 0 });
  const pitches = new Set(events.filter((e) => e.speak).map((e) => e.pitch));
  assert.deepEqual([...pitches], [DEFAULT_CONFIG.basePitch]);
});

test('the same seed reproduces the same performance', () => {
  const a = analyzeText('repeat after me!', DEFAULT_CONFIG, 12345);
  const b = analyzeText('repeat after me!', DEFAULT_CONFIG, 12345);
  const c = analyzeText('repeat after me!', DEFAULT_CONFIG, 999);
  assert.deepEqual(a.events.map((e) => e.pitch), b.events.map((e) => e.pitch));
  assert.notDeepEqual(a.events.map((e) => e.pitch), c.events.map((e) => e.pitch));
});

test('timeline advances monotonically and reports its own duration', () => {
  const { events, duration } = analyzeText('Hello, world!\nSecond line.', DEFAULT_CONFIG);
  let previous = -1;
  for (const ev of events) {
    assert.ok(ev.start >= previous, 'start times must not go backwards');
    previous = ev.start;
  }
  const last = events[events.length - 1];
  assert.equal(duration, last.start + last.advance);
  assert.ok(duration > 1, `duration ${duration}`);
});

test('whitespace is timed but never voiced', () => {
  const { events } = analyzeText('a b\nc', DEFAULT_CONFIG);
  const space = events.find((e) => e.char === ' ');
  const newline = events.find((e) => e.char === '\n');
  assert.equal(space.speak, false);
  assert.equal(newline.speak, false);
  assert.ok(newline.advance > space.advance, 'line breaks hold longer than spaces');
});

test('every letter maps to a vowel and the expected consonant class', () => {
  const { events } = analyzeText('abcdefghijklmnopqrstuvwxyz', DEFAULT_CONFIG);
  for (const ev of events) {
    assert.ok(VOWEL_KEYS.includes(ev.vowel), `${ev.char} → ${ev.vowel}`);
  }
  const byChar = Object.fromEntries(events.map((e) => [e.char, e]));
  assert.equal(byChar.p.consonant, 'plosive');
  assert.equal(byChar.s.consonant, 'fricative');
  assert.equal(byChar.a.consonant, null, 'vowels have no burst');
});

test('playbackRate varies per character and tracks the pitch slider', () => {
  const { events } = analyzeText('aeiou', { ...DEFAULT_CONFIG, jitter: 0 });
  const rates = events.map((e) => e.rate);
  assert.equal(new Set(rates.map((r) => r.toFixed(3))).size, 5, 'each vowel has its own rate');

  const high = analyzeText('aeiou', { ...DEFAULT_CONFIG, jitter: 0, basePitch: 880 }).events.map((e) => e.rate);
  const low = analyzeText('aeiou', { ...DEFAULT_CONFIG, jitter: 0, basePitch: 150 }).events.map((e) => e.rate);
  assert.ok(Math.max(...high) > Math.max(...rates), 'higher base pitch raises the register');
  assert.ok(Math.max(...low) < Math.min(...rates), 'lower base pitch drops the register');
  assert.ok(Math.max(...high) / Math.min(...low) > 2, 'the register spans at least an octave');
});

test('rate stays inside safe bounds at the extremes', () => {
  const { events } = analyzeText('a?a?a?a', { basePitch: 1200, jitter: 200, speed: 10 });
  for (const ev of events) {
    if (!ev.speak) continue;
    assert.ok(ev.rate >= RATE_BOUNDS.min && ev.rate <= RATE_BOUNDS.max, `rate ${ev.rate}`);
    assert.ok(ev.pitch >= 40 && ev.pitch <= 8000, `pitch ${ev.pitch}`);
  }
});

test('robotic mode snaps pitches to semitones', () => {
  const { events } = analyzeText('testing robot voice', {
    ...DEFAULT_CONFIG,
    mode: 'robotic',
    basePitch: 440,
    jitter: 120,
  });
  for (const ev of events) {
    if (!ev.speak) continue;
    const semitones = 12 * Math.log2(ev.pitch / 440);
    assert.ok(Math.abs(semitones - Math.round(semitones)) < 1e-9, `${ev.pitch} not on a semitone`);
  }
});

test('empty and whitespace-only text produce an empty performance', () => {
  assert.equal(analyzeText('', DEFAULT_CONFIG).events.length, 0);
  assert.equal(analyzeText('   ', DEFAULT_CONFIG).events.length, 0, 'whitespace-only is a no-op');
  assert.equal(analyzeText('\n\t ', DEFAULT_CONFIG).duration, 0);
  assert.equal(analyzeText(undefined, DEFAULT_CONFIG).duration, 0);
});

test('surrogate pairs count as one character each', () => {
  const { events } = analyzeText('a😀b', DEFAULT_CONFIG);
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((e) => e.index), [0, 1, 2]);
});

test('digit characters blip', () => {
  const { events } = analyzeText('42', DEFAULT_CONFIG);
  assert.ok(events.every((e) => e.speak));
  assert.equal(events[0].consonant, 'plosive');
});

// ---------------------------------------------------------------------------
section('Config normalisation');

test('out-of-range values are clamped to the UI ranges', () => {
  const cfg = normalizeConfig({ basePitch: 99999, speed: -5, jitter: 9000, volume: 12, decay: 1, voiceCharacter: 99 });
  assert.equal(cfg.basePitch, 1200);
  assert.equal(cfg.speed, 10);
  assert.equal(cfg.jitter, 200);
  assert.equal(cfg.volume, 1);
  assert.equal(cfg.decay, 15);
  assert.equal(cfg.voiceCharacter, 2.4);
});

test('unknown modes and waveforms fall back to defaults', () => {
  const cfg = normalizeConfig({ mode: 'kazoo', waveform: 'theremin' });
  assert.equal(cfg.mode, DEFAULT_CONFIG.mode);
  assert.equal(cfg.waveform, DEFAULT_CONFIG.waveform);
});

test('every preset produces a valid, in-range config', () => {
  for (const preset of PRESETS) {
    const cfg = normalizeConfig(presetConfig(preset.id));
    assert.equal(cfg.mode, preset.mode, preset.name);
    assert.ok(cfg.basePitch >= 100 && cfg.basePitch <= 1200, preset.name);
    assert.ok(cfg.speed >= 10 && cfg.speed <= 150, preset.name);
    assert.ok(cfg.volume > 0 && cfg.volume <= 1, preset.name);
    const { events } = analyzeText('Preset check!', cfg);
    assert.ok(events.length > 0, preset.name);
  }
});

test('the pentatonic blip pack spans a musical interval set', () => {
  assert.equal(NOTE_BLIP_PACK.length, 5);
  const semis = NOTE_BLIP_PACK.map((b) => b.semitones);
  assert.deepEqual(semis, [...semis].sort((a, b) => a - b), 'ordered');
  assert.equal(new Set(semis).size, 5, 'all distinct');
});

// ---------------------------------------------------------------------------
section('Curves');

test('soft clip is transparent below the knee and bounded above it', () => {
  const curve = makeSoftClipCurve(2048, 0.7);
  const at = (x) => {
    const i = Math.round(((x + 1) / 2) * (curve.length - 1));
    return curve[Math.max(0, Math.min(curve.length - 1, i))];
  };
  assert.ok(Math.abs(at(0.1) - 0.1) < 0.002, 'unity at 0.1');
  assert.ok(Math.abs(at(-0.5) + 0.5) < 0.002, 'unity at -0.5');
  assert.ok(Math.abs(at(0.7) - 0.7) < 0.002, 'unity at the knee');
  assert.ok(at(1) <= 1 && at(1) > 0.9, `rail ${at(1)}`);
  assert.ok(at(-1) >= -1 && at(-1) < -0.9, 'negative rail');
  for (let i = 1; i < curve.length; i += 1) {
    assert.ok(curve[i] >= curve[i - 1], 'monotonic');
    assert.ok(Math.abs(curve[i]) <= 1, 'never exceeds full scale');
  }
});

test('bitcrush curve makes a staircase with the requested step count', () => {
  const curve = makeBitcrushCurve(4);
  const unique = new Set([...curve].map((v) => v.toFixed(6)));
  assert.ok(unique.size <= 9, `expected a coarse staircase, got ${unique.size} levels`);
  assert.ok(unique.size > 2, 'not a flat line');
});

// ---------------------------------------------------------------------------
section('Formant synthesis');

test('every vowel renders a normalised, click-free buffer', () => {
  const ctx = stubContext();
  for (const vowel of VOWEL_KEYS) {
    const buffer = createVowelBuffer(ctx, vowel, { formantScale: 1 });
    const data = buffer.getChannelData(0);
    assert.equal(buffer.sampleRate, 44100);
    assert.ok(Math.abs(buffer.duration - 0.34) < 0.001, 'duration');

    let peak = 0;
    let nonFinite = 0;
    for (let i = 0; i < data.length; i += 1) {
      if (!Number.isFinite(data[i])) nonFinite += 1;
      peak = Math.max(peak, Math.abs(data[i]));
    }
    assert.equal(nonFinite, 0, `${vowel}: no NaN/Infinity`);
    assert.ok(Math.abs(peak - 0.92) < 0.01, `${vowel}: peak ${peak}`);
    assert.ok(Math.abs(data[0]) < 0.05, `${vowel}: starts at silence`);
    assert.equal(Math.abs(data[data.length - 1]), 0, `${vowel}: ends at exact zero`);
    const tailRms = Math.sqrt(data.slice(-400).reduce((a, v) => a + v * v, 0) / 400);
    assert.ok(tailRms < peak * 0.05, `${vowel}: tail decays (${tailRms.toFixed(4)})`);
  }
});

test('vowels are actually distinct from one another', () => {
  const ctx = stubContext();
  const spectra = VOWEL_KEYS.map((v) => Array.from(createVowelBuffer(ctx, v).getChannelData(0).slice(1000, 1400)));
  for (let i = 0; i < spectra.length; i += 1) {
    for (let j = i + 1; j < spectra.length; j += 1) {
      const diff = spectra[i].reduce((acc, value, k) => acc + Math.abs(value - spectra[j][k]), 0) / spectra[i].length;
      assert.ok(diff > 0.01, `${VOWEL_KEYS[i]} vs ${VOWEL_KEYS[j]} too similar (${diff.toFixed(4)})`);
    }
  }
});

test('voiceCharacter scales the formants', () => {
  const ctx = stubContext();
  const low = createVowelBuffer(ctx, 'A', { formantScale: 0.7 }).getChannelData(0);
  const high = createVowelBuffer(ctx, 'A', { formantScale: 1.7 }).getChannelData(0);
  let diff = 0;
  for (let i = 800; i < 1200; i += 1) diff += Math.abs(low[i] - high[i]);
  assert.ok(diff / 400 > 0.01, 'different formant scaling must change the waveform');
});

test('consonant noise bursts are shaped and bounded', () => {
  const ctx = stubContext();
  const plosive = createNoiseBuffer(ctx, 'plosive');
  const fricative = createNoiseBuffer(ctx, 'fricative');
  const white = createNoiseBuffer(ctx, 'white');

  assert.ok(plosive.duration < fricative.duration, 'plosives are shorter than fricatives');
  assert.ok(Math.abs(white.duration - 1) < 0.001, 'white noise is a 1 s loop source');

  for (const [name, buffer] of Object.entries({ plosive, fricative, white })) {
    const data = buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    assert.ok(peak > 0.1, `${name} has signal`);
    assert.ok(peak <= 1, `${name} peak ${peak}`);
    // Envelopes must decay: the tail is quieter than the body.
    const head = data.slice(0, Math.floor(data.length / 4)).reduce((a, v) => a + Math.abs(v), 0);
    const tail = data.slice(-Math.floor(data.length / 4)).reduce((a, v) => a + Math.abs(v), 0);
    if (name !== 'white') assert.ok(tail < head, `${name} decays`);
  }
});

// ---------------------------------------------------------------------------
section('Utilities');

test('mulberry32 is deterministic and stays in [0,1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 500; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1, `value ${value}`);
  }
});

test('hashSeed is stable and spreads across inputs', () => {
  assert.equal(hashSeed('hello'), hashSeed('hello'));
  assert.notEqual(hashSeed('hello'), hashSeed('hellp'));
  assert.ok(hashSeed('') >= 0);
});

test('quantizeToSemitone snaps to the nearest twelve-tone step', () => {
  assert.equal(quantizeToSemitone(440, 440), 440);
  assert.ok(Math.abs(quantizeToSemitone(445, 440) - 440) < 1e-9, 'close snaps down');
  assert.ok(Math.abs(quantizeToSemitone(460, 440) - 440 * 2 ** (1 / 12)) < 1e-9, 'close snaps up');
});

// ---------------------------------------------------------------------------
console.log('');
if (failures.length > 0) {
  console.error(`\u001b[31m${failures.length} test(s) failed\u001b[0m (${passed} passed)\n`);
  for (const failure of failures) {
    console.error(`— ${failure.name}\n${failure.error.stack}\n`);
  }
  process.exit(1);
}
console.log(`\u001b[32mAll ${passed} audio-core tests passed.\u001b[0m\n`);
