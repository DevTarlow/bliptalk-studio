/** Miniature waveform glyph for the waveform picker. */

import { WAVE_PATHS } from './iconData.js';

export default function WaveGlyph({ wave, className = 'h-3 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 12"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={WAVE_PATHS[wave] ?? WAVE_PATHS.square} />
    </svg>
  );
}
