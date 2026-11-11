'use client';

import React from 'react';

const ROLE_LABELS = {
  manajemen: 'Management',
  pengawas: 'Supervisor',
  mandor: 'Foreman',
};

// Decorative SDG 9 line art: truss bridge, crane and skyline. Purely visual.
function InfraPattern() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 140"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute bottom-0 right-0 h-full w-[70%] max-w-[460px] text-brand-400 opacity-60 sm:opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* skyline */}
      <g strokeOpacity="0.35">
        <path d="M250 140V78h22v62M276 140V58h26v82M306 140V92h18v48M328 140V70h20v70" />
        <path d="M282 66h14M282 76h14M282 86h14M334 80h8M334 90h8M256 88h10M256 98h10" />
      </g>
      {/* crane */}
      <g strokeOpacity="0.55">
        <path d="M372 140V30M366 140V30M366 30h6M366 44l6 -8M366 58l6 -8M366 72l6 -8M366 86l6 -8M366 100l6 -8M366 114l6 -8" />
        <path d="M300 30h112M372 22l-72 8M372 22l40 8M372 22v8" />
        <path d="M330 30v26" strokeDasharray="2 3" />
        <rect x="324" y="56" width="12" height="9" rx="1.5" />
      </g>
      {/* truss bridge */}
      <g strokeOpacity="0.7">
        <path d="M120 120h180" />
        <path d="M140 120l20 -28h100l20 28" />
        <path d="M160 92l20 28 20 -28 20 28 20 -28 20 28" />
        <path d="M180 92v28M200 92v28M220 92v28M240 92v28" strokeOpacity="0.5" />
        <path d="M130 140v-20M290 140v-20" />
      </g>
      {/* ground line */}
      <path d="M90 140h330" strokeOpacity="0.4" />
    </svg>
  );
}

export default function DashboardHeader({ role, title, subtitle, compactTitle = false }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-cream to-white px-5 py-5 shadow-soft sm:px-7 sm:py-6 anim-up">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl" />
      <InfraPattern />
      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-[min(100%,40rem)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 ring-4 ring-brand-500/15" />
            {ROLE_LABELS[role]} workspace
          </div>
          <h2
            title={title}
            className={`max-w-full break-words font-semibold tracking-tight text-navy-800 ${
              compactTitle
                ? 'line-clamp-2 text-lg leading-snug sm:text-2xl'
                : 'text-2xl sm:text-[28px]'
            }`}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-navy-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
