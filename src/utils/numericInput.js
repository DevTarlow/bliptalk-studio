/**
 * BlipTalk Studio — typed-number parsing for the slider value boxes.
 *
 * Pure and DOM-free so `scripts/selftest.mjs` can exercise it in Node. The
 * slider and the number box stay in sync because both ultimately call
 * `onChange` with a value inside the same min/max/step contract.
 */

/** Plain decimal syntax only: no hex, exponents or thousands separators. */
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** Number of decimal places implied by a step, e.g. 0.05 → 2. */
function decimalsForStep(step) {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Parse a user-typed value and fit it to a slider's range and step grid.
 *
 * @param {unknown} raw
 * @param {{ min: number, max: number, step?: number }} bounds
 * @returns {number|null} the clamped/snapped value, or null when the text is
 *   not a usable number (caller should revert to the previous value)
 */
export function parseNumericInput(raw, { min, max, step = 1 } = {}) {
  const text = String(raw ?? '').trim();
  if (text === '' || !DECIMAL_PATTERN.test(text)) return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;

  const lo = Number.isFinite(Number(min)) ? Number(min) : 0;
  const hi = Number.isFinite(Number(max)) ? Number(max) : Number.MAX_SAFE_INTEGER;
  const safeStep = Number.isFinite(Number(step)) && Number(step) > 0 ? Number(step) : 1;

  let value = Math.min(hi, Math.max(lo, parsed));
  value = lo + Math.round((value - lo) / safeStep) * safeStep;
  value = Math.min(hi, Math.max(lo, value));

  // Snap maths accumulates float error; round to the grid's own precision.
  return Number(value.toFixed(decimalsForStep(safeStep)));
}
