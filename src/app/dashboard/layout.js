'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { ProjectProvider } from '@/components/ProjectContext';
import { MotionProvider } from '@/components/motion';
import { useScrollLock } from '@/lib/useScrollLock';

const ROLE_HOME = {
  manajemen: '/dashboard/management',
  pengawas: '/dashboard/supervisor',
  mandor: '/dashboard/foreman',
};

const PAGE_TITLE = {
  '/dashboard/management': 'Dashboard',
  '/dashboard/management/import-cost-estimate': 'Cost Estimate Import',
  '/dashboard/supervisor': 'Dashboard',
  '/dashboard/foreman': 'Dashboard',
  '/dashboard/foreman/new-report': 'Submit Progress Report',
};

function pathAllowed(role, pathname) {
  if (role === 'manajemen') return pathname.startsWith('/dashboard/management');
  if (role === 'pengawas') return pathname.startsWith('/dashboard/supervisor');
  if (role === 'mandor') return pathname.startsWith('/dashboard/foreman');
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
    // Shell skeleton while the session is checked: navy sidebar + light content (no single-color flash).
    return (
      <div aria-busy="true" className="h-[100dvh] w-full overflow-hidden bg-canvas p-0 sm:p-6 lg:p-8">
        <div className="mx-auto flex h-full w-full max-w-[1400px] overflow-hidden border-line sm:h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border sm:shadow-card md:rounded-[28px] lg:h-[calc(100dvh-4rem)]">
          <div className="hidden w-[220px] shrink-0 bg-navy-900 p-4 md:block lg:w-[250px] lg:p-5">
            <div className="flex items-center gap-2.5 px-1">
              <span className="h-8 w-8 rounded-lg bg-orange-500" />
              <span className="h-3 w-20 rounded-full bg-white/15" />
            </div>
            <div className="mt-6 h-10 rounded-lg bg-white/10" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="h-14 shrink-0 border-b border-line bg-surface sm:h-16" />
            <div className="flex-1 space-y-4 bg-canvas p-4 sm:p-6 lg:p-8">
              <div className="h-24 rounded-card border border-line bg-surface" />
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="h-28 rounded-card border border-line bg-surface" />
                <div className="h-28 rounded-card border border-line bg-surface" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-canvas sm:h-auto sm:min-h-screen sm:overflow-visible p-0 sm:p-6 lg:p-8 anim-fade">
      <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden border-0 sm:border border-line bg-canvas shadow-none sm:shadow-card sm:rounded-2xl sm:h-[calc(100dvh-3rem)] md:h-[calc(100dvh-3rem)] md:rounded-[28px] lg:h-[calc(100dvh-4rem)] md:flex-row anim-shell">
        <Sidebar
          role={role}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        <div className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden bg-canvas">
          <Navbar
            title={PAGE_TITLE[pathname] || 'Dashboard'}
            userNama={userNama}
            onNamaChange={setUserNama}
            onLogout={handleLogout}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main key={pathname} className="min-w-0 w-full max-w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 anim-page pb-6 bg-canvas">
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
      <MotionProvider>
        <DashboardShell>{children}</DashboardShell>
      </MotionProvider>
    </ProjectProvider>
  );
}
