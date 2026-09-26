/** Pixel-style checkbox rendered as a switch-like button. */

import { Check } from 'lucide-react';

export default function Toggle({ label, checked, hint, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2 text-left"
    >
      <span className="pixel-check mt-0.5" data-on={checked}>
        <Check size={11} strokeWidth={4} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
          {label}
        </span>
        {hint ? <span className="mt-0.5 block text-[9px] leading-tight text-slate-600">{hint}</span> : null}
      </span>
    </button>
  );
}
