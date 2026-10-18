'use client';

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function ActionToast({ title, message, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[110] flex justify-center px-4 sm:top-6">
      <div
        role="status"
        aria-live="polite"
        className="modal-panel pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <CheckCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss success message"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
