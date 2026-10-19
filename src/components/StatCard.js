'use client';

import React from 'react';
import AnimatedCounter from '@/components/AnimatedCounter';

const TONE_CLASSES = {
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10',
  slate: 'bg-slate-50 text-slate-600 ring-1 ring-slate-900/5',
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
    <div className="group rounded-2xl border border-gray-100 bg-white p-4 card-hover active:scale-[0.99] transition duration-200">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition duration-200 group-hover:scale-105 ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
          {icon}
        </div>
        {hint ? <span className="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">{hint}</span> : null}
      </div>
      <p className="mt-4 text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
        {renderValue(value)}
      </div>
    </div>
  );
}
