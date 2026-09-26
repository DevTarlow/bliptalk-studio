/**
 * BlipTalk Studio — modes & presets.
 *
 * Pure data, no React: the engine, the UI and the tests all read from here.
 */

import { DEFAULT_CONFIG } from './intonation.js';

export const MODES = [
  {
    id: 'chiptune',
    label: '8-Bit Chiptune',
    icon: 'gamepad',
    blurb: 'NES / Game Boy oscillator blips',
  },
  {
    id: 'animalese',
    label: 'Animalese',
    icon: 'cat',
    blurb: 'Formant slices, one per letter',
  },
  {
    id: 'robotic',
    label: 'Retro Noise/Robotic',
    icon: 'bot',
    blurb: 'Bitcrushed ring-mod static',
  },
];

export const PRESETS = [
  {
    id: 'cozy-animal',
    name: 'Cozy Animal',
    mode: 'animalese',
    patch: {
      basePitch: 520,
      speed: 62,
      jitter: 26,
      decay: 90,
      volume: 0.75,
      waveform: 'triangle',
      punctuation: true,
      voiceCharacter: 1.15,
    },
  },
  {
    id: 'sarcastic-robot',
    name: 'Sarcastic Robot',
    mode: 'robotic',
    patch: {
      basePitch: 190,
      speed: 78,
      jitter: 55,
      decay: 150,
      volume: 0.7,
      waveform: 'square',
      punctuation: true,
      voiceCharacter: 0.8,
    },
  },
  {
    id: '8bit-hero',
    name: '8-Bit Hero',
    mode: 'chiptune',
    patch: {
      basePitch: 620,
      speed: 45,
      jitter: 12,
      decay: 70,
      volume: 0.8,
      waveform: 'square',
      punctuation: true,
      voiceCharacter: 1,
    },
  },
  {
    id: 'dark-wizard',
    name: 'Dark Wizard',
    mode: 'chiptune',
    patch: {
      basePitch: 165,
      speed: 95,
      jitter: 40,
      decay: 260,
      volume: 0.85,
      waveform: 'sawtooth',
      punctuation: true,
      voiceCharacter: 0.7,
    },
  },
  {
    id: 'fairy-whispers',
    name: 'Fairy Whispers',
    mode: 'animalese',
    patch: {
      basePitch: 950,
      speed: 32,
      jitter: 70,
      decay: 45,
      volume: 0.55,
      waveform: 'sine',
      punctuation: true,
      voiceCharacter: 1.6,
    },
  },
];

export const DEFAULT_PRESET_ID = '8bit-hero';

/**
 * Preset loaded when a mode tab is clicked *while a preset is active*.
 * If the user has hand-tuned the sliders we keep their patch and only switch
 * the synthesis mode — no surprise parameter jumps.
 */
export const MODE_DEFAULT_PRESET = {
  chiptune: '8bit-hero',
  animalese: 'cozy-animal',
  robotic: 'sarcastic-robot',
};

export const DEFAULT_TEXT =
  'Welcome to my shop, adventurer! What can I get for you today?';

/** Full config for a preset id, falling back to the defaults. */
export function presetConfig(id) {
  const preset = PRESETS.find((p) => p.id === id);
  return { ...DEFAULT_CONFIG, ...(preset ? { mode: preset.mode, ...preset.patch } : {}) };
}

/**
 * The five single-character blips in the "individual blip pack".
 *
 * Chiptune/robotic modes are pitched instruments, so the pack ships a
 * pentatonic scale (root, 2nd, 3rd, 5th, 6th) — the intervals game code
 * usually wants for menu ticks. Animalese gets the five raw vowels instead,
 * because its blips are phonemes rather than notes.
 */
export const VOWEL_BLIP_PACK = [
  { text: 'A', label: 'A', name: 'blip_1_a.wav' },
  { text: 'E', label: 'E', name: 'blip_2_e.wav' },
  { text: 'I', label: 'I', name: 'blip_3_i.wav' },
  { text: 'O', label: 'O', name: 'blip_4_o.wav' },
  { text: 'U', label: 'U', name: 'blip_5_u.wav' },
];

export const NOTE_BLIP_PACK = [
  { semitones: 0, label: 'Root', name: 'blip_1_root.wav' },
  { semitones: 2, label: '2nd', name: 'blip_2_second.wav' },
  { semitones: 4, label: '3rd', name: 'blip_3_third.wav' },
  { semitones: 7, label: '5th', name: 'blip_4_fifth.wav' },
  { semitones: 9, label: '6th', name: 'blip_5_sixth.wav' },
];

/** Max character count accepted by the UI (keeps export times civilised). */
export const MAX_TEXT_LENGTH = 600;
