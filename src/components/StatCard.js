'use client';

import React from 'react';
import AnimatedCounter from '@/components/AnimatedCounter';

// Icon chip tints. Status tones (emerald / amber / rose) keep their meaning;
// orange / sky / teal / violet are decorative accents for neutral metrics.
const TONE_CLASSES = {
  orange: 'chip-orange',
  sky: 'chip-sky',
  teal: 'chip-teal',
  violet: 'chip-violet',
  amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/70',
  emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70',
  rose: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/70',
  slate: 'bg-navy-50 text-navy-500 ring-1 ring-navy-200/70',
};

function renderValue(val) {
  if (val == null || val === '—' || val === '-') {
    return '—';
  }

  if (typeof val === 'number') {
    return <AnimatedCounter value={val} />;
  }

  const str = String(val).trim();
  // Check if string ends with %
  if (str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1));
    if (Number.isFinite(num)) {
      const prefix = str.startsWith('+') ? '+' : '';
      return <AnimatedCounter value={num} prefix={prefix} suffix="%" />;
    }
  }

  // Check if pure integer or float
  const parsed = Number(str);
  if (Number.isFinite(parsed) && !str.includes(' ') && !str.includes(':')) {
    return <AnimatedCounter value={parsed} />;
  }

  return val;
}

export default function StatCard({ icon, label, value, hint, tone = 'slate' }) {
  return (
    <div className="group relative overflow-hidden surface p-4 card-hover sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition duration-200 group-hover:scale-105 ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
          {icon}
        </div>
        {hint ? <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-500 ring-1 ring-navy-200/60">{hint}</span> : null}
      </div>
      <p className="mt-4 text-xs font-medium text-navy-500">{label}</p>
      <div className="mt-1 break-words text-[22px] font-semibold leading-tight tracking-tight text-navy-800 tabular-nums sm:text-[28px]">
        {renderValue(value)}
      </div>
    </div>
  );
}
