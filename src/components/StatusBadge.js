import React from 'react';

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();

  if (s === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success-text">
        <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
        Approved
      </span>
    );
  }

  if (s === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger">
        <span className="h-1.5 w-1.5 rounded-full bg-danger"></span>
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning-text">
      <span className="h-1.5 w-1.5 rounded-full bg-warning"></span>
      Pending
    </span>
  );
}
