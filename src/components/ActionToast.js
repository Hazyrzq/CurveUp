'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function ActionToast({ title, message, onDismiss, duration = 4000 }) {
  const [progress, setProgress] = useState(100);

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
        className="pointer-events-auto relative flex w-full max-w-md items-start gap-3.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md anim-content-enter transition duration-200"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/10">
          <CheckCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Animated Countdown Progress Bar */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
          <div
            className="h-full bg-teal-600 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
