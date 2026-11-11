'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { useScrollLock } from '@/lib/useScrollLock';

export default function ImageLightbox({
  src,
  alt = 'Progress photo',
  caption,
  subtitle,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useScrollLock(!!src);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!src) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, onClose]);

  if (!mounted || !src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-cream/95 p-3 sm:p-6 backdrop-blur-xl anim-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header / Bar */}
      <div className="flex w-full max-w-5xl items-center justify-between text-ink shrink-0 z-10">
        <div className="min-w-0 pr-4">
          <p className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base">
            {alt}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-ink-secondary mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
            className="btn-secondary hidden w-10 px-0 sm:inline-flex active:scale-95"
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original image in new tab"
            className="btn-secondary px-3 active:scale-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Original</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="btn-primary w-10 px-0 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div
        className="flex flex-1 w-full max-w-5xl items-center justify-center overflow-auto p-2 sm:p-4 my-2"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={src}
          alt={alt}
          onClick={() => setIsZoomed(!isZoomed)}
          className={`rounded-card object-contain shadow-card-hover ring-1 ring-line transition-transform duration-200 cursor-zoom-in select-none ${ isZoomed ? 'scale-150 cursor-zoom-out' : 'max-h-[75vh] w-auto max-w-full' }`}
        />
      </div>

      {/* Bottom Caption Bar */}
      {caption && (
        <div className="w-full max-w-2xl rounded-full bg-surface px-4 py-2 text-center text-xs text-ink-secondary shadow-card shrink-0 z-10 border border-line">
          {caption}
        </div>
      )}
    </div>,
    document.body
  );
}
