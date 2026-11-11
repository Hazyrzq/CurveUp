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

  const tone = isError
    ? {
        chip: 'bg-danger-soft text-danger ring-danger/30',
        bar: 'bg-danger',
        track: 'bg-danger-soft',
        border: 'border-danger/30',
      }
    : {
        chip: 'bg-orange-50 text-orange-600 ring-orange-100',
        bar: 'bg-orange-500',
        track: 'bg-orange-100/70',
        border: 'border-orange-100/80',
      };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[110] flex justify-center px-4 sm:top-6 anim-fade">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto relative flex w-full max-w-md items-center gap-3.5 overflow-hidden rounded-2xl border ${tone.border} bg-white/95 px-4 py-3.5 shadow-card-hover backdrop-blur-xl anim-content-enter`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ${tone.chip}`}
        >
          {isError ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {message && <p className="mt-0.5 text-xs leading-5 text-ink-secondary">{message}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded-full p-1.5 text-ink-secondary transition hover:bg-canvas hover:text-ink active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Countdown bar */}
        <div className={`absolute inset-x-4 bottom-1.5 h-1 overflow-hidden rounded-full ${tone.track}`}>
          <div
            className={`h-full rounded-full transition-all duration-75 ease-linear ${tone.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
