'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import InfraSceneFallback from './InfraSceneFallback';
import useSceneMode from './useSceneMode';

// three.js + R3F live in their own chunk and are fetched only on large screens.
const InfraScene = dynamic(() => import('./InfraScene'), { ssr: false, loading: () => null });

export default function LoginVisual() {
  // Reduced motion → 3D rendered as one static frame (no animation). Photo only on small screens / no WebGL.
  // 768px = where the login visual panel becomes visible (md), so tablets get the 3D scene too.
  const { mode, reducedMotion } = useSceneMode({ allowReducedMotion: true, minWidth: 768 });
  const [ready, setReady] = useState(false);

  return (
    <div className="absolute inset-0">
      {/* Navy placeholder — same colors as the 3D scene background, so there is no image flash
          on large screens while the scene loads (e.g. right after logging out). */}
      <div aria-hidden="true" className="scene-navy absolute inset-0" />

      {mode !== '3d' && (
        // While undecided, CSS hides the image on large screens (where 3D will load)
        // and shows it immediately on small screens.
        <div className={`absolute inset-0 ${mode === 'pending' ? 'scene-fallback-pending' : ''}`}>
          <InfraSceneFallback />
        </div>
      )}

      {mode === '3d' && (
        <div
          className={`absolute inset-0 transition-opacity duration-[350ms] ease-out ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <InfraScene reducedMotion={reducedMotion} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
