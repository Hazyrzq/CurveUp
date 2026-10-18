import React from 'react';

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();

  if (s === 'approved') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
        Approved
      </span>
    );
  }

  if (s === 'rejected') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
      Pending
    </span>
  );
}
