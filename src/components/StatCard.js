import React from 'react';

const TONE_CLASSES = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-50 text-slate-500',
};

export default function StatCard({ icon, label, value, hint, tone = 'slate' }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 card-hover">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
          {icon}
        </div>
        {hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
      </div>
      <p className="mt-4 text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}
