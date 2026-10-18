'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { ProjectProvider } from '@/components/ProjectContext';

const ROLE_HOME = {
  manajemen: '/dashboard/manajemen',
  pengawas: '/dashboard/pengawas',
  mandor: '/dashboard/mandor',
};

const PAGE_TITLE = {
  '/dashboard/manajemen': 'Dashboard',
  '/dashboard/manajemen/import-rab': 'RAB Import',
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
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

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

    setRole(storedRole);
    setUserNama(storedNama || '');
    setReady(true);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_nama');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_username');
    router.push('/login');
  };

  if (!ready) {
    return <div className="min-h-screen bg-canvas" />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-canvas p-0 sm:p-6 lg:p-8 anim-fade">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col overflow-x-hidden border-0 sm:border border-slate-200/70 bg-white shadow-none sm:shadow-shell md:h-[calc(100vh-3rem)] md:min-h-[calc(100vh-3rem)] md:overflow-hidden md:rounded-[28px] lg:h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)] md:flex-row anim-shell">
        <Sidebar
          role={role}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        <div className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-x-hidden">
          <Navbar
            title={PAGE_TITLE[pathname] || 'Dashboard'}
            userNama={userNama}
            onNamaChange={setUserNama}
            onLogout={handleLogout}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main key={pathname} className="min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-6 md:min-h-0 md:flex-1 md:overflow-auto anim-page">
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
