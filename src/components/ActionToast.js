'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function ActionToast({
  title,
  message,
  onDismiss,
  duration = 4000,
  variant = 'success',
}) {
  const [progress, setProgress] = useState(100);
  const isError = variant === 'error';

  useEffect(() => {
    if (!duration || !onDismiss) return undefined;
    const intervalTime = 50;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[110] flex justify-center px-4 sm:top-6 anim-fade">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative flex w-full max-w-md items-start gap-3.5 overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lift ring-1 ring-navy-900/5 backdrop-blur-xl anim-content-enter transition duration-200"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
            isError
              ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
              : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
          }`}
        >
          {isError ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-navy-900">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-navy-600">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-lg p-1.5 text-navy-400 transition hover:bg-navy-100 hover:text-navy-700 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Animated Countdown Progress Bar */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-navy-100">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isError ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
