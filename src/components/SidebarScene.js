'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import useSceneMode from '@/components/login/useSceneMode';

// Same InfraScene as the login panel, compact framing. Own chunk, client only, >= 768px.
const InfraScene = dynamic(() => import('@/components/login/InfraScene'), { ssr: false, loading: () => null });

/**
 * Small decorative 3D scene at the bottom of the navy sidebar (tablet + desktop).
 * - mounted only at >= 768px (where the sidebar is docked) with WebGL; not in the mobile drawer
 * - dpr capped at 1.5, render loop stops while the tab is hidden (inside InfraScene)
 * - prefers-reduced-motion → one static frame
 * - fades in (350 ms) once the first frame is drawn; the sidebar navy is the placeholder
 */
export default function SidebarScene() {
  const { mode, reducedMotion } = useSceneMode({ allowReducedMotion: true, minWidth: 768 });
  const [ready, setReady] = useState(false);
  if (mode !== '3d') return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none mx-auto mt-3 hidden h-[120px] w-full max-w-[200px] shrink-0 transition-opacity duration-[350ms] ease-out md:block lg:h-[140px] ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <InfraScene compact reducedMotion={reducedMotion} onReady={() => setReady(true)} />
    </div>
  );
}
