'use client';

import { useEffect, useState } from 'react';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

/**
 * Decides whether a 3D InfraScene should be mounted.
 *
 * mode:
 *  - 'pending' : not decided yet (first paint / before idle). Show the navy placeholder.
 *  - '3d'      : screen >= minWidth (default 1024px) with WebGL (and motion allowed, unless allowReducedMotion).
 *  - 'static'  : everything else — show the static fallback.
 *
 * allowReducedMotion: when true, prefers-reduced-motion still gets 3D (rendered as a single
 * static frame by InfraScene). When false, reduced motion falls back to the static image.
 */
export default function useSceneMode({ allowReducedMotion = false, deferUntilIdle = true, minWidth = 1024 } = {}) {
  const [mode, setMode] = useState('pending');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const reduce = motion.matches;
      setReducedMotion(reduce);
      setMode(wide.matches && supportsWebGL() && (allowReducedMotion || !reduce) ? '3d' : 'static');
    };

    let cancel = () => {};
    if (deferUntilIdle) {
      // Let the page become interactive before pulling in the three.js chunk.
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
      const cancelIdle = window.cancelIdleCallback || clearTimeout;
      const handle = idle(sync, { timeout: 600 });
      cancel = () => cancelIdle(handle);
    } else {
      sync();
    }

    wide.addEventListener('change', sync);
    motion.addEventListener('change', sync);
    return () => {
      cancel();
      wide.removeEventListener('change', sync);
      motion.removeEventListener('change', sync);
    };
  }, [allowReducedMotion, deferUntilIdle, minWidth]);

  return { mode, reducedMotion };
}
