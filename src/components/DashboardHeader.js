'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Page header card: plain white card, title + one short line. No eyebrow, no gradient.
export default function DashboardHeader({ title, subtitle, compactTitle = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="surface px-5 py-5 sm:px-6 sm:py-6"
    >
      <h2
        title={title}
        className={`max-w-full break-words font-semibold tracking-tight text-ink ${
          compactTitle ? 'line-clamp-2 text-lg leading-snug sm:text-title' : 'text-title'
        }`}
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p> : null}
    </motion.div>
  );
}
