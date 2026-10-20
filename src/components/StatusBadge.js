import React from 'react';

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();

  if (s === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        Approved
      </span>
    );
  }

  if (s === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
      Pending
    </span>
  );
}
