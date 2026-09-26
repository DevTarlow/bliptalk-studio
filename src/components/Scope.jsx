/**
 * Scope — chunky spectrum visualiser.
 *
 * Reads the engine's AnalyserNode directly inside a requestAnimationFrame loop
 * and paints into a canvas, so a 60 fps visualiser never re-renders React.
 * Draws a flat idle line until an AudioContext actually exists.
 */

import { useEffect, useRef } from 'react';

const BAR_COUNT = 20;
const BLOCK = 3; // px per "pixel" block, before device-pixel scaling
const COLORS = ['#34d399', '#34d399', '#22d3ee', '#22d3ee', '#fbbf24'];

export default function Scope({ engine, width = 96, height = 26, active = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return undefined;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx2d.scale(dpr, dpr);

    let frame = 0;
    let analyser = null;
    let data = null;
    let smoothed = new Float32Array(BAR_COUNT);

    const draw = () => {
      frame = requestAnimationFrame(draw);

      if (!analyser) {
        analyser = engine.getAnalyser();
        if (analyser) data = new Uint8Array(analyser.frequencyBinCount);
      }

      ctx2d.clearRect(0, 0, width, height);

      if (!analyser || !data) {
        // Idle: flat baseline, dim.
        ctx2d.fillStyle = '#1e293b';
        ctx2d.fillRect(0, height - BLOCK, width, BLOCK);
        return;
      }

      analyser.getByteFrequencyData(data);

      // Average the low ~40% of the spectrum into chunky bars — the top end of
      // a blip is mostly noise and makes the display look random.
      const usable = Math.floor(data.length * 0.42);
      const perBar = Math.max(1, Math.floor(usable / BAR_COUNT));
      const maxBlocks = Math.floor((height - BLOCK) / (BLOCK + 1));

      for (let i = 0; i < BAR_COUNT; i += 1) {
        let sum = 0;
        for (let k = 0; k < perBar; k += 1) sum += data[i * perBar + k];
        const level = sum / perBar / 255;
        // Fast attack, slow release — classic VU ballistics.
        smoothed[i] = level > smoothed[i] ? level : smoothed[i] * 0.82 + level * 0.18;

        const blocks = Math.round(smoothed[i] * maxBlocks * 1.25);
        const x = i * (width / BAR_COUNT);
        const barWidth = Math.max(2, width / BAR_COUNT - 1);
        ctx2d.fillStyle = COLORS[Math.floor((i / BAR_COUNT) * COLORS.length)] ?? '#34d399';

        for (let b = 0; b < blocks && b < maxBlocks; b += 1) {
          const y = height - BLOCK - b * (BLOCK + 1) - BLOCK;
          ctx2d.globalAlpha = 1 - b * 0.045;
          ctx2d.fillRect(x, y, barWidth, BLOCK);
        }
      }
      ctx2d.globalAlpha = 1;

      // Baseline.
      ctx2d.fillStyle = active ? '#065f46' : '#1e293b';
      ctx2d.fillRect(0, height - BLOCK, width, BLOCK);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [engine, width, height, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block border border-slate-800 bg-slate-950/80"
      aria-hidden="true"
    />
  );
}
