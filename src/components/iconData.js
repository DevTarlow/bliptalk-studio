/**
 * Icon data shared by the UI — kept out of the component files so each `.jsx`
 * module exports components only (React Fast Refresh requirement).
 */

import { Bot, Cat, Gamepad2 } from 'lucide-react';

/** Mode id → lucide icon component. */
export const MODE_ICONS = {
  chiptune: Gamepad2,
  animalese: Cat,
  robotic: Bot,
};

/**
 * Hand-drawn waveform glyphs (24×12). Lucide has no square/triangle/sawtooth
 * shapes, and these read far better than a generic wave icon at 24px.
 */
export const WAVE_PATHS = {
  square: 'M1 10 L1 2 L7 2 L7 10 L13 10 L13 2 L19 2 L19 10 L23 10',
  triangle: 'M1 10 L6 2 L11 10 L16 2 L21 10 L23 7',
  sawtooth: 'M1 10 L8 2 L8 10 L15 2 L15 10 L22 2 L22 10',
  sine: 'M1 6 Q4 0 7 6 T13 6 T19 6 T23 6',
  noise: 'M1 7 L3 3 L5 9 L7 4 L9 10 L11 5 L13 8 L15 2 L17 9 L19 6 L21 10 L23 5',
};

export const WAVE_LABELS = {
  square: 'Square',
  triangle: 'Triangle',
  sawtooth: 'Saw',
  sine: 'Sine',
  noise: 'Noise',
};
