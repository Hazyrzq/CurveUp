'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import InfraSceneFallback from './InfraSceneFallback';

// three.js + R3F live in their own chunk and are fetched only on large screens.
const InfraScene = dynamic(() => import('./InfraScene'), { ssr: false, loading: () => null });

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

export default function LoginVisual() {
  const [use3D, setUse3D] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setUse3D(wide.matches && supportsWebGL());
      setReducedMotion(motion.matches);
    };
    // Defer until the browser is idle so the login form is interactive first.
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const handle = idle(sync);
    wide.addEventListener('change', sync);
    motion.addEventListener('change', sync);
    return () => {
      cancelIdle(handle);
      wide.removeEventListener('change', sync);
      motion.removeEventListener('change', sync);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <InfraSceneFallback />
      {use3D && (
        <div
          className={`absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_30%,#1f2a40_0%,#0b1324_70%)] transition-opacity duration-700 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <InfraScene reducedMotion={reducedMotion} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
