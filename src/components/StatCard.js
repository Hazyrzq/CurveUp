'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';
import { itemVariants } from '@/components/motion';

// Icon chips (40px). Neutral metrics → orange tint. Status metrics → soft status colors.
const TONE_CLASSES = {
  orange: 'chip-orange',
  sky: 'chip-orange',
  teal: 'chip-orange',
  violet: 'chip-orange',
  amber: 'bg-warning-soft text-warning-text',
  emerald: 'bg-success-soft text-success-text',
  rose: 'bg-danger-soft text-danger',
  slate: 'bg-canvas text-ink-secondary',
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

// Inside a <Stagger> grid the card fades up in sequence (variants); elsewhere it renders static.
export default function StatCard({ icon, label, value, hint, tone = 'slate' }) {
  return (
    <motion.div variants={itemVariants} className="surface p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
          {icon}
        </div>
        {hint ? <span title={hint} className="badge bg-canvas text-ink-secondary">{hint}</span> : null}
      </div>
      <p className="mt-4 text-xs font-medium text-ink-secondary">{label}</p>
      <div className="mt-1 break-words text-[22px] font-bold leading-tight tracking-tight text-ink tabular-nums sm:text-[28px]">
        {renderValue(value)}
      </div>
    </motion.div>
  );
}
