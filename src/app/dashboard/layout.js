'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { ProjectProvider } from '@/components/ProjectContext';
import { useScrollLock } from '@/lib/useScrollLock';

const ROLE_HOME = {
  manajemen: '/dashboard/manajemen',
  pengawas: '/dashboard/pengawas',
  mandor: '/dashboard/mandor',
};

const PAGE_TITLE = {
  '/dashboard/manajemen': 'Dashboard',
  '/dashboard/manajemen/import-rab': 'Cost Estimate Import',
  '/dashboard/pengawas': 'Dashboard',
  '/dashboard/mandor': 'Dashboard',
  '/dashboard/mandor/laporan-baru': 'Submit Progress Report',
};

function pathAllowed(role, pathname) {
  if (role === 'manajemen') return pathname.startsWith('/dashboard/manajemen');
  if (role === 'pengawas') return pathname.startsWith('/dashboard/pengawas');
  if (role === 'mandor') return pathname.startsWith('/dashboard/mandor');
  return false;
}

function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('');
  const [userNama, setUserNama] = useState('');
  const [ready, setReady] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useScrollLock(mobileSidebarOpen);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMobileSidebar();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileSidebarOpen, closeMobileSidebar]);

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role');
    const storedNama = localStorage.getItem('user_nama');

    if (!storedRole || !ROLE_HOME[storedRole]) {
      router.replace('/login');
      return;
    }

    if (!pathAllowed(storedRole, pathname)) {
      router.replace(ROLE_HOME[storedRole]);
      return;
    }

    const LEGACY_NAMA_MAP = {
      'Manajemen CurveUp': 'CurveUp Management',
      'Pengawas Lapangan': 'Site Supervisor',
      'Mandor Utama': 'Lead Foreman',
    };
    const normalizedNama = LEGACY_NAMA_MAP[storedNama] || storedNama || '';
    if (normalizedNama !== storedNama) {
      localStorage.setItem('user_nama', normalizedNama);
    }

    setRole(storedRole);
    setUserNama(normalizedNama);
    setReady(true);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_nama');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_username');
    sessionStorage.removeItem('curveup_selected_proyek_id');
    router.push('/login');
  };

  if (!ready) {
    return <div className="min-h-screen bg-canvas" />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-white sm:bg-canvas sm:h-auto sm:min-h-screen sm:overflow-visible p-0 sm:p-6 lg:p-8 anim-fade">
      <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden border-0 sm:border border-white/80 bg-white/85 sm:backdrop-blur-xl ring-0 sm:ring-1 sm:ring-navy-900/5 shadow-none sm:shadow-shell sm:rounded-2xl sm:h-[calc(100dvh-3rem)] md:h-[calc(100dvh-3rem)] md:rounded-[28px] lg:h-[calc(100dvh-4rem)] md:flex-row anim-shell">
        <Sidebar
          role={role}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        <div className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden bg-white/70">
          <Navbar
            title={PAGE_TITLE[pathname] || 'Dashboard'}
            userNama={userNama}
            onNamaChange={setUserNama}
            onLogout={handleLogout}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main key={pathname} className="min-w-0 w-full max-w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-6 anim-page pb-6 bg-transparent">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <ProjectProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProjectProvider>
  );
}
