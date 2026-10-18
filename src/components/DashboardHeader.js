'use client';

import React from 'react';

const ROLE_LABELS = {
  manajemen: 'Management',
  pengawas: 'Supervisor',
  mandor: 'Foreman',
};

export default function DashboardHeader({ role, title, subtitle, compactTitle = false }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
          {ROLE_LABELS[role]} workspace
        </div>
        <h2
          title={title}
          className={`max-w-full break-words font-semibold tracking-tight text-slate-950 ${
            compactTitle
              ? 'line-clamp-2 text-base leading-snug sm:text-xl'
              : 'text-2xl'
          }`}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
