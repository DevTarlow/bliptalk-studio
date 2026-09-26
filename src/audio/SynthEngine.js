/**
 * BlipTalk Studio — SynthEngine.
 *
 * A dependency-free retro dialogue synth built directly on the Web Audio API.
 *
 * Design note that matters: live playback and WAV export run through the *same*
 * `scheduleVoice()` routine and the *same* `analyzeText()` performance. Live
 * playback schedules into an AudioContext, export schedules into an
 * OfflineAudioContext at the same sample rate. There is no second code path to
 * drift out of sync, so the exported file is literally what you heard.
 *
 * Three voices:
 *   chiptune  — NES/Game Boy oscillator blips (square/triangle/sawtooth/sine/noise)
 *   animalese — formant vowel slices + noise-burst consonants, pitch via playbackRate
 *   robotic   — bitcrushed, ring-modulated square + static
 */

import {
  analysisDuration,
  analyzeText,
  clamp,
  hashSeed,
  normalizeConfig,
  RATE_BOUNDS,
} from './intonation.js';
import { createVoiceBank, WAVEFORM_BRIGHTNESS } from './formants.js';
import { encodeWav } from './wav.js';
import { NOTE_BLIP_PACK, VOWEL_BLIP_PACK } from './presets.js';

/** Below this many seconds of audio we schedule everything up front. */
const PRESCHEDULE_LIMIT = 25;
/** Lookahead window (seconds) for the rolling scheduler on long passages. */
const SCHEDULE_AHEAD = 0.35;
const PUMP_INTERVAL_MS = 30;
/** Small delay before the first blip so scheduling always lands in the future. */
const LIVE_LEAD = 0.07;

export function createAudioContext() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio API is not available in this browser.');
  return new Ctor();
}

export function createOfflineContext(channels, length, sampleRate) {
  const Ctor = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Ctor) throw new Error('OfflineAudioContext is not available in this browser.');
  return new Ctor(channels, length, sampleRate);
}

/**
 * Transparent soft-limiter curve.
 *
 * Identity below ±0.7, smooth saturation above, asymptote at ±1. Overlapping
 * blips therefore never hard-clip, and a single quiet blip passes through
 * completely untouched (no level change, no added harmonics).
 */
export function makeSoftClipCurve(samples = 2048, knee = 0.7) {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    const abs = Math.abs(x);
    if (abs <= knee) {
      curve[i] = x;
    } else {
      const over = (abs - knee) / (1 - knee);
      curve[i] = Math.sign(x) * (knee + (1 - knee) * Math.tanh(over));
    }
  }
  return curve;
}

/** Staircase quantisation curve — the "bitcrush" in robotic mode. */
export function makeBitcrushCurve(steps = 11, samples = 4096) {
  const levels = Math.max(2, Math.round(steps));
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.round(x * levels) / levels;
  }
  return curve;
}

/**
 * Percussive blip envelope: near-instant attack, exponential decay to silence.
 */
function applyBlipEnvelope(param, time, peak, attack, noteLength) {
  const end = time + Math.max(attack + 0.006, noteLength);
  param.setValueAtTime(0, time);
  param.linearRampToValueAtTime(Math.max(0.0002, peak), time + attack);
  param.exponentialRampToValueAtTime(0.0001, end);
  param.setValueAtTime(0, end + 0.0015);
  return end;
}

/** Apply an optional portamento from `ev.pitchFrom` to `ev.pitch`. */
function applyPitch(param, ev, time) {
  const target = clamp(ev.pitch, 20, 9000);
  const from = clamp(ev.pitchFrom ?? ev.pitch, 20, 9000);
  param.setValueAtTime(from, time);
  if (ev.glide > 0 && Math.abs(from - target) > 0.5) {
    param.exponentialRampToValueAtTime(target, time + ev.glide);
  } else {
    param.setValueAtTime(target, time);
  }
}

/** Shared note-length maths for the two oscillator modes. */
function blipTiming(config) {
  const tick = config.speed / 1000;
  const decay = config.decay / 1000;
  // Cap by the character slot so long decays on fast text can't turn to mud.
  return { tick, noteLength: clamp(Math.min(decay, tick * 4.5), 0.018, 1.2) };
}

// ---------------------------------------------------------------------------
// Voice 1 — Procedural chiptune oscillator
// ---------------------------------------------------------------------------

function scheduleChiptune(ctx, destination, ev, config, bank, t0) {
  const time = t0 + ev.start;
  const { noteLength } = blipTiming(config);
  const peak = ev.gain * 0.5;

  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(destination);

  let source;
  if (config.waveform === 'noise') {
    // NES noise channel: looped white noise through a pitch-tracking band-pass.
    source = ctx.createBufferSource();
    source.buffer = bank.white;
    source.loop = true;
    source.playbackRate.value = clamp(ev.pitch / 660, 0.35, 3.2);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = clamp(ev.pitch * 1.6, 90, 9000);
    band.Q.value = 1.2;
    source.connect(band);
    band.connect(amp);
  } else {
    source = ctx.createOscillator();
    source.type = config.waveform;
    applyPitch(source.frequency, ev, time);
    source.connect(amp);
  }

  const end = applyBlipEnvelope(amp.gain, time, peak, 0.004, noteLength);
  source.start(time);
  source.stop(end + 0.03);

  return [source];
}

// ---------------------------------------------------------------------------
// Voice 2 — Animalese / phoneme pitch-shifter
// ---------------------------------------------------------------------------

function scheduleAnimalese(ctx, destination, ev, config, bank, t0) {
  const time = t0 + ev.start;
  const { tick } = blipTiming(config);
  const nodes = [];

  // One shared low-pass per blip keeps the formant slices warm instead of harsh.
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = clamp(3800 * config.voiceCharacter, 900, 12000);
  tone.Q.value = 0.5;
  tone.connect(destination);

  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(tone);
  nodes.push(amp);

  const rate = clamp(ev.rate, RATE_BOUNDS.min, RATE_BOUNDS.max);
  // Short chips are the whole point of Animalese: never longer than ~160 ms.
  const heard = clamp(Math.min(tick * 1.25, 0.16), 0.032, 0.16);

  // Leading consonant burst (plosive thump / fricative hiss).
  if (ev.consonant) {
    const burstBuffer = ev.consonant === 'plosive' ? bank.plosive : bank.fricative;
    const burst = ctx.createBufferSource();
    burst.buffer = burstBuffer;
    burst.playbackRate.value = clamp(rate * (ev.consonant === 'plosive' ? 1 : 0.9), 0.4, 3);
    const burstGain = ctx.createGain();
    burstGain.gain.value = 0;
    burst.connect(burstGain);
    burstGain.connect(destination);
    const burstLength = ev.consonant === 'plosive' ? 0.03 : 0.05;
    const burstEnd = applyBlipEnvelope(
      burstGain.gain,
      time,
      ev.gain * (ev.consonant === 'plosive' ? 0.34 : 0.22),
      0.001,
      burstLength,
    );
    burst.start(time);
    burst.stop(burstEnd + 0.02);
    nodes.push(burst);
  }

  // Vowel slice, pitched by playbackRate (character + pitch sliders).
  const source = ctx.createBufferSource();
  source.buffer = bank.vowels[ev.vowel] ?? bank.vowels.A;
  source.playbackRate.value = rate;

  const wanted = heard * rate; // `start(when, offset, duration)` is buffer time
  const bufferDuration = source.buffer.duration;
  const maxOffset = Math.max(0, bufferDuration - wanted - 0.005);
  const offset = clamp(ev.bufferOffset, 0, 1) * maxOffset;

  const envEnd = applyBlipEnvelope(amp.gain, time, ev.gain * 0.95, 0.005, heard);
  source.connect(amp);
  source.start(time, offset, wanted);
  source.stop(envEnd + 0.03);
  nodes.push(source);

  return nodes;
}

// ---------------------------------------------------------------------------
// Voice 3 — Retro noise / robotic
// ---------------------------------------------------------------------------

function scheduleRobotic(ctx, destination, ev, config, bank, t0) {
  const time = t0 + ev.start;
  const { noteLength } = blipTiming(config);
  const peak = ev.gain * 0.42;
  const nodes = [];

  const amp = ctx.createGain();
  amp.gain.value = 0;

  // Telephone-ish band + quantiser = "robot".
  const band = ctx.createBiquadFilter();
  band.type = 'highpass';
  band.frequency.value = 140;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = clamp(3600 * config.voiceCharacter, 900, 11000);

  const crusher = ctx.createWaveShaper();
  crusher.curve = makeBitcrushCurve(clamp(2 ** (config.voiceCharacter * 3.5), 3, 64));
  crusher.oversample = 'none';

  amp.connect(band);
  band.connect(lowpass);
  lowpass.connect(crusher);
  crusher.connect(destination);

  // Bipolar ring modulation (the Dalek trick) at a sub-audio rate.
  const ring = ctx.createGain();
  ring.gain.value = 0;
  ring.connect(amp);
  const ringOsc = ctx.createOscillator();
  ringOsc.type = 'sine';
  ringOsc.frequency.value = clamp(ev.pitch * 0.31, 22, 220);
  const ringDepth = ctx.createGain();
  ringDepth.gain.value = 0.85;
  ringOsc.connect(ringDepth);
  ringDepth.connect(ring.gain);
  ringOsc.start(time);
  nodes.push(ringOsc);

  const oscType = config.waveform === 'noise' ? 'square' : config.waveform;

  const carrier = ctx.createOscillator();
  carrier.type = oscType;
  applyPitch(carrier.frequency, ev, time);
  const carrierGain = ctx.createGain();
  carrierGain.gain.value = 0.62;
  carrier.connect(carrierGain);
  carrierGain.connect(ring);
  carrier.start(time);
  nodes.push(carrier);

  const sub = ctx.createOscillator();
  sub.type = 'square';
  sub.frequency.value = clamp(ev.pitch * 0.5, 20, 9000);
  const subGain = ctx.createGain();
  subGain.gain.value = 0.3;
  sub.connect(subGain);
  subGain.connect(ring);
  sub.start(time);
  nodes.push(sub);

  // Static layer.
  const static_ = ctx.createBufferSource();
  static_.buffer = bank.white;
  static_.loop = true;
  static_.playbackRate.value = clamp(ev.pitch / 520, 0.4, 2.6);
  const staticBand = ctx.createBiquadFilter();
  staticBand.type = 'bandpass';
  staticBand.frequency.value = clamp(ev.pitch * 2.4, 200, 9000);
  staticBand.Q.value = 0.9;
  const staticGain = ctx.createGain();
  staticGain.gain.value = config.waveform === 'noise' ? 0.5 : 0.16;
  static_.connect(staticBand);
  staticBand.connect(staticGain);
  staticGain.connect(ring);
  static_.start(time);
  nodes.push(static_);

  const end = applyBlipEnvelope(amp.gain, time, peak, 0.006, noteLength);
  for (const node of nodes) node.stop(end + 0.03);

  return nodes;
}

/** Router: one event in, one voice out. Shared by playback and export. */
export function scheduleVoice(ctx, destination, ev, config, bank, t0 = 0) {
  if (!ev || !ev.speak) return [];
  switch (config.mode) {
    case 'animalese':
      return scheduleAnimalese(ctx, destination, ev, config, bank, t0);
    case 'robotic':
      return scheduleRobotic(ctx, destination, ev, config, bank, t0);
    default:
      return scheduleChiptune(ctx, destination, ev, config, bank, t0);
  }
}

// ---------------------------------------------------------------------------
// Voice bank cache
// ---------------------------------------------------------------------------

/**
 * Vowel/noise banks are pure data and cost ~3M sin() calls to synthesise, so
 * they are cached and shared between the live context and the offline renderer.
 * Offline renders deliberately use the live sample rate, which is what makes
 * this reuse valid — AudioBuffers are context-agnostic containers.
 */
const bankCache = new Map();
const BANK_CACHE_LIMIT = 8;

function getSharedBank(ctx, config) {
  const key = `${ctx.sampleRate}|${config.voiceCharacter.toFixed(3)}|${config.waveform}`;
  const cached = bankCache.get(key);
  if (cached) return cached;

  const bank = createVoiceBank(ctx, {
    formantScale: config.voiceCharacter,
    brightness: WAVEFORM_BRIGHTNESS[config.waveform] ?? 1,
  });
  bankCache.set(key, bank);
  if (bankCache.size > BANK_CACHE_LIMIT) {
    bankCache.delete(bankCache.keys().next().value);
  }
  return bank;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class SynthEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} */
    this.master = null;
    /** @type {AnalyserNode|null} */
    this.analyser = null;
    /** @type {object|null} */
    this.voiceBank = null;
    /** @type {string|null} */
    this.voiceBankKey = null;
    /** @type {object|null} */
    this.playback = null;
    this.volume = 0.8;
    this._unlockPromise = null;
  }

  /** True while a performance is in flight. */
  get isPlaying() {
    return this.playback !== null;
  }

  /** Live AudioContext state: 'running' | 'suspended' | 'closed' | 'unavailable'. */
  get contextState() {
    return this.ctx ? this.ctx.state : 'unavailable';
  }

  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 44100;
  }

  /**
   * Create the AudioContext + master chain on demand.
   * Browsers start contexts suspended until a user gesture; `unlock()` resumes it.
   */
  ensureContext() {
    if (this.ctx) return this.ctx;
    const ctx = createAudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume;

    const limiter = ctx.createWaveShaper();
    limiter.curve = makeSoftClipCurve();
    limiter.oversample = '2x';

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;

    master.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    return ctx;
  }

  /**
   * Satisfy the autoplay policy. Safe to call on every user gesture.
   * @returns {Promise<string>} the resulting context state
   */
  async unlock() {
    let ctx;
    try {
      ctx = this.ensureContext();
    } catch {
      return 'unavailable';
    }
    if (ctx.state === 'running') return ctx.state;
    if (!this._unlockPromise) {
      this._unlockPromise = Promise.resolve()
        .then(() => ctx.resume())
        .catch(() => undefined)
        .finally(() => {
          this._unlockPromise = null;
        });
    }
    await this._unlockPromise;
    return ctx.state;
  }

  /** Analyser for the visualiser (null before the first unlock). */
  getAnalyser() {
    return this.analyser;
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1);
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.015);
    }
  }

  /** Voice bank for the live context (shared, cached across contexts). */
  getVoiceBank(config) {
    const ctx = this.ensureContext();
    this.voiceBank = getSharedBank(ctx, config);
    this.voiceBankKey = `${ctx.sampleRate}|${config.voiceCharacter.toFixed(3)}|${config.waveform}`;
    return this.voiceBank;
  }

  /**
   * Speak a line, character by character.
   *
   * @param {string} text
   * @param {object} config
   * @param {(index:number, progress:number)=>void} [onChar] current character
   *        index (-1 when idle) plus 0..1 progress
   * @param {(reason:'ended'|'stopped')=>void} [onEnd]
   * @returns {{ duration:number, events:object[], stop:()=>boolean }}
   */
  playText(text, config, onChar = () => {}, onEnd = () => {}) {
    const cfg = normalizeConfig(config);
    const ctx = this.ensureContext();

    // Autoplay policy: a gesture got us here, so this resume will stick.
    if (ctx.state !== 'running') ctx.resume().catch(() => undefined);
    this.setVolume(cfg.volume);

    this.stop(); // cancel anything already speaking

    const performance_ = analyzeText(text, cfg);
    const events = performance_.events;
    const total = analysisDuration(performance_, 0.2);

    if (events.length === 0) {
      onChar(-1, 0);
      onEnd('ended');
      return { duration: 0, events, stop: () => false };
    }

    const bank = this.getVoiceBank(cfg);
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.master);

    const t0 = ctx.currentTime + LIVE_LEAD;
    const state = {
      cancelled: false,
      bus,
      sources: [],
      cursor: 0,
      timer: 0,
      endTimer: 0,
      raf: 0,
      events,
      t0,
      total,
      onChar,
      onEnd,
    };
    this.playback = state;

    // ---- scheduling ------------------------------------------------------
    const pump = (horizon) => {
      if (state.cancelled) return;
      const now = ctx.currentTime;
      while (state.cursor < events.length && t0 + events[state.cursor].start <= now + horizon) {
        const nodes = scheduleVoice(ctx, bus, events[state.cursor], cfg, bank, t0);
        const endsAt = t0 + events[state.cursor].start + events[state.cursor].duration + 0.5;
        for (const node of nodes) state.sources.push({ node, endsAt });
        state.cursor += 1;
      }
      // Prune nodes that have already finished so long lines don't leak memory.
      if (state.sources.length > 64) {
        state.sources = state.sources.filter((entry) => entry.endsAt > now);
      }
    };

    // Short lines are scheduled in one shot: immune to background-tab timer
    // throttling. Long lines roll forward on a lookahead window.
    const preschedule = total <= PRESCHEDULE_LIMIT;
    pump(preschedule ? total + 0.5 : SCHEDULE_AHEAD);
    if (!preschedule) {
      state.timer = setInterval(() => pump(SCHEDULE_AHEAD), PUMP_INTERVAL_MS);
    }

    // ---- UI synchronisation ---------------------------------------------
    let lastIndex = -2;
    const uiTick = () => {
      if (state.cancelled) return;
      const elapsed = ctx.currentTime - t0;
      let index = -1;
      for (let i = 0; i < events.length; i += 1) {
        if (events[i].start <= elapsed) index = events[i].index;
        else break;
      }
      if (index !== lastIndex) {
        lastIndex = index;
        onChar(index, clamp(elapsed / total, 0, 1));
      }
      if (elapsed < total) state.raf = requestAnimationFrame(uiTick);
    };
    if (typeof requestAnimationFrame === 'function') {
      state.raf = requestAnimationFrame(uiTick);
    }

    // ---- completion ------------------------------------------------------
    // Natural end and manual stop share one teardown path, differing only in
    // the reason they report to onEnd.
    const msLeft = Math.max(0, (t0 + total - ctx.currentTime) * 1000);
    state.endTimer = setTimeout(() => this.endPlayback(state, 'ended'), msLeft + 80);

    return {
      duration: total,
      events,
      stop: () => this.stop(),
    };
  }

  /**
   * Tear down a performance and notify the callbacks.
   * @param {object} state
   * @param {'ended'|'stopped'} reason
   * @returns {boolean} whether this call actually ended the performance
   */
  endPlayback(state, reason) {
    if (!state || state.cancelled) return false;
    state.cancelled = true;
    if (this.playback === state) this.playback = null;

    if (state.timer) clearInterval(state.timer);
    if (state.endTimer) clearTimeout(state.endTimer);
    if (state.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.raf);

    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const entry of state.sources) {
      try {
        entry.node.stop(now);
      } catch {
        /* already stopped or not a source node */
      }
      try {
        entry.node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    state.sources.length = 0;

    try {
      state.bus.gain.cancelScheduledValues(now);
      state.bus.gain.setValueAtTime(0, now);
      state.bus.disconnect();
    } catch {
      /* context torn down */
    }

    state.onChar(-1, 0);
    state.onEnd(reason);
    return true;
  }

  /**
   * Stop the current performance immediately.
   * @returns {boolean} whether anything was playing
   */
  stop() {
    return this.endPlayback(this.playback, 'stopped');
  }

  /**
   * Render a line offline, sample-accurate.
   *
   * @param {string} text
   * @param {object} config
   * @param {{ seed?:number, tail?:number, sampleRate?:number, channels?:number }} [options]
   * @returns {Promise<AudioBuffer>}
   */
  async renderBuffer(text, config, options = {}) {
    const cfg = normalizeConfig(config);
    const { tail = 0.28, channels = 1 } = options;
    // Match the live context's sample rate so exports are bit-comparable.
    const sampleRate = options.sampleRate ?? this.sampleRate;
    const seed = options.seed ?? hashSeed(`${cfg.mode}|${text}|${cfg.basePitch}|${cfg.speed}|${cfg.jitter}|${cfg.voiceCharacter}`);

    const performance_ = analyzeText(text, cfg, seed);
    const total = analysisDuration(performance_, tail);
    const frames = Math.max(1, Math.ceil(total * sampleRate));
    const offline = createOfflineContext(channels, frames, sampleRate);

    const master = offline.createGain();
    master.gain.value = cfg.volume;
    const limiter = offline.createWaveShaper();
    limiter.curve = makeSoftClipCurve();
    limiter.oversample = '2x';
    master.connect(limiter);
    limiter.connect(offline.destination);

    const bank = getSharedBank(offline, cfg);
    for (const ev of performance_.events) {
      scheduleVoice(offline, master, ev, cfg, bank, 0);
    }

    return offline.startRendering();
  }

  /**
   * Render the current line to a downloadable 16-bit WAV.
   * @returns {Promise<{blob:Blob, filename:string, duration:number, sampleRate:number, bytes:number}>}
   */
  async exportWav(text, config) {
    const buffer = await this.renderBuffer(text, config, { tail: 0.32 });
    const blob = encodeWav(buffer);
    return {
      blob,
      filename: 'dialogue_blip.wav',
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      bytes: blob.size,
    };
  }

  /**
   * Render five distinct single-character blips for engine triggering.
   * Animalese → the five vowel phonemes. Chiptune/robotic → a pentatonic scale.
   *
   * @returns {Promise<Array<{name:string,label:string,blob:Blob,duration:number,bytes:number}>>}
   */
  async exportBlipPack(config) {
    const cfg = normalizeConfig(config);
    const sampleRate = this.sampleRate;
    const specs = cfg.mode === 'animalese'
      ? VOWEL_BLIP_PACK.map((item) => ({ ...item, text: item.text, patch: {} }))
      : NOTE_BLIP_PACK.map((item) => ({
          ...item,
          text: 'A',
          patch: { basePitch: clamp(cfg.basePitch * 2 ** (item.semitones / 12), 100, 1200) },
        }));

    const results = [];
    for (const spec of specs) {
      const blipConfig = { ...cfg, jitter: 0, ...spec.patch };
      // A fixed seed keeps every blip in the pack identical across exports.
      const seed = hashSeed(`${spec.name}|${blipConfig.mode}|${blipConfig.basePitch}`);
      const buffer = await this.renderBuffer(spec.text, blipConfig, {
        seed,
        tail: 0.1,
        sampleRate,
      });
      const blob = encodeWav(buffer);
      results.push({
        name: spec.name,
        label: spec.label,
        blob,
        duration: buffer.duration,
        bytes: blob.size,
      });
    }
    return results;
  }

  /** Release the AudioContext (used when the app unmounts). */
  async dispose() {
    this.stop();
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.master = null;
      this.analyser = null;
      this.voiceBank = null;
      this.voiceBankKey = null;
      try {
        await ctx.close();
      } catch {
        /* already closed */
      }
    }
  }
}

export default SynthEngine;
