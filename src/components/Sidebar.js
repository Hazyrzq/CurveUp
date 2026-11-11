'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Edit3,
  Plus,
  FolderKanban,
  Search,
  X,
  UploadCloud,
  Download,
} from 'lucide-react';
import { useProject } from '@/components/ProjectContext';
import { useScrollLock } from '@/lib/useScrollLock';
import { motion } from 'framer-motion';
import ActionToast from '@/components/ActionToast';
import SidebarScene from '@/components/SidebarScene';
import { indicatorSpring } from '@/components/motion';

const ROLE_HOME = {
  manajemen: '/dashboard/manajemen',
  pengawas: '/dashboard/pengawas',
  mandor: '/dashboard/mandor',
};

// Orange 3px indicator on the active item; slides between items (shared layoutId).
function ActiveBar() {
  return (
    <motion.span
      layoutId="sidebar-active-bar"
      transition={indicatorSpring}
      aria-hidden="true"
      className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-orange-500"
    />
  );
}

function NavButton({ active, icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white transition-colors ${
        active ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {active && <ActiveBar />}
      <span className={active ? 'text-orange-500' : 'text-navy-300'}>{icon}</span>
      {children}
    </button>
  );
}

export default function Sidebar({ role, mobileOpen = false, onMobileClose = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();
  const isCurrent = (path) => pathname === path;
  const { filtered, selectedId, search, setSearch, selectProject, reload } = useProject();
  const [adding, setAdding] = useState(false);
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [rabFile, setRabFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  useScrollLock(adding);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!adding) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) setAdding(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [adding, saving]);

  const handleProjectClick = (id) => {
    onMobileClose();
    if (Number(selectedId) === Number(id)) {
      selectProject(null);
      if (pathname.includes('/laporan-baru')) {
        router.push(ROLE_HOME[role] || '/dashboard/mandor');
      }
      return;
    }

    selectProject(id);

    if (role === 'mandor') {
      if (pathname !== '/dashboard/mandor') {
        router.push('/dashboard/mandor');
      }
      return;
    }

    const home = ROLE_HOME[role] || '/dashboard/manajemen';
    if (pathname !== home) router.push(home);
  };

  const addProject = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      const msgText = 'Project name is required.';
      setErr(msgText);
      setToast({ title: 'Missing project name', message: msgText, variant: 'error' });
      return;
    }
    if (!rabFile) {
      const msgText = 'No file was uploaded.';
      setErr(msgText);
      setToast({ title: 'Missing Cost Estimate file', message: msgText, variant: 'error' });
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const formData = new FormData();
      formData.append('file', rabFile);
      const previewRes = await fetch('/api/rab/import', {
        method: 'POST',
        body: formData,
      });
      const preview = await previewRes.json();
      if (!previewRes.ok || !preview.success) {
        const msgText = preview.message || 'Could not read the Cost Estimate file.';
        setErr(msgText);
        setToast({ title: 'Invalid Cost Estimate file', message: msgText, variant: 'error' });
        return;
      }

      const saveRes = await fetch('/api/rab/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_proyek: nama.trim(),
          lokasi,
          tgl_mulai: tglMulai || null,
          tgl_selesai: tglSelesai || null,
          items: preview.data.items,
        }),
      });
      const json = await saveRes.json();
      if (!saveRes.ok || !json.success) {
        const msgText = json.message || 'Could not create the project and save its Cost Estimate.';
        setErr(msgText);
        setToast({ title: 'Could not save project', message: msgText, variant: 'error' });
        return;
      }

      setNama('');
      setLokasi('');
      setTglMulai('');
      setTglSelesai('');
      setRabFile(null);
      setAdding(false);
      setToast({
        title: 'Project created',
        message: json.message || 'Cost Estimate saved for this project. The planned S-curve has been updated.',
        variant: 'success',
      });
      await reload();
      selectProject(json.proyek_id);
      onMobileClose();
      if (pathname !== ROLE_HOME.manajemen) router.push(ROLE_HOME.manajemen);
    } catch (e2) {
      setErr(e2.message);
      setToast({ title: 'Error', message: e2.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/cost_estimate_template.xlsx';
    link.download = 'cost_estimate_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <button
      type="button"
      aria-label="Close navigation menu"
      tabIndex={mobileOpen ? 0 : -1}
      onClick={onMobileClose}
      className={`fixed inset-0 z-40 min-h-screen bg-navy-950/40 transition-opacity duration-300 ease-out md:hidden ${ mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0' }`}
    />
    <aside
      id="dashboard-sidebar"
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] shrink-0 flex-col bg-navy-900 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-navy-300 shadow-dialog transition-transform duration-300 ease-out md:relative md:inset-auto md:z-auto md:h-full md:w-[220px] md:translate-x-0 md:shadow-none lg:w-[250px] lg:p-5 ${ mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0' }`}
    >
      {/* Logo — white wordmark with the orange mark */}
      <div className="mb-6 flex items-center justify-between px-1">
        <p className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 19c5 0 6-14 16-14" /></svg>
          </span>
          CurveUp
        </p>
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-300 hover:bg-white/10 hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mb-6 flex flex-col gap-1">
        {role === 'manajemen' && (
          <NavButton
            active={isCurrent('/dashboard/manajemen') && !selectedId}
            icon={<LayoutDashboard className="h-4 w-4" />}
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== ROLE_HOME.manajemen) router.push(ROLE_HOME.manajemen);
            }}
          >
            Dashboard
          </NavButton>
        )}
        {role === 'pengawas' && (
          <NavButton
            active={isCurrent('/dashboard/pengawas') && !selectedId}
            icon={<CheckSquare className="h-4 w-4" />}
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== ROLE_HOME.pengawas) router.push(ROLE_HOME.pengawas);
            }}
          >
            Dashboard
          </NavButton>
        )}
        {role === 'mandor' && (
          <NavButton
            active={pathname === '/dashboard/mandor' && !selectedId}
            icon={<LayoutDashboard className="h-4 w-4" />}
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== '/dashboard/mandor') router.push('/dashboard/mandor');
            }}
          >
            Dashboard
          </NavButton>
        )}
      </nav>

      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Projects</p>
        {role === 'manajemen' && (
          <button
            type="button"
            onClick={() => {
              setErr('');
              setAdding(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600"
            title="Add project"
            aria-label="Add project"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-navy-600 bg-navy-900 px-3 text-navy-300 transition focus-within:border-orange-500">
        <Search className="h-4 w-4 shrink-0" />
        <span className="sr-only">Search projects</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find project..."
          className="w-full bg-transparent text-base text-white outline-none placeholder:text-navy-300 md:text-[13px]"
        />
      </label>

      <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-1 pb-3">
        {filtered.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs text-navy-300">No projects found.</p>
        ) : (
          filtered.map((p) => {
            const active = Number(selectedId) === Number(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProjectClick(p.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={`${p.nama_proyek}${p.lokasi ? ` at ${p.lokasi}` : ''}`}
                title={p.nama_proyek}
                className={`relative flex w-full items-center rounded-lg px-3 py-2.5 text-left transition-colors ${ active ? 'bg-white/10' : 'hover:bg-white/5' }`}
              >
                {active && <ActiveBar />}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13px] text-white ${active ? 'font-semibold' : 'font-medium'}`}>
                    {p.nama_proyek}
                  </span>
                  {p.lokasi && (
                    <span className="mt-0.5 block truncate text-[11px] text-navy-300">{p.lokasi}</span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      <SidebarScene />
    </aside>
    {portalReady && toast && createPortal(
      <ActionToast
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast(null)}
      />,
      document.body
    )}
    {portalReady && adding && role === 'manajemen' && createPortal(
      <div
        className="fixed inset-0 z-50 flex flex-col min-h-screen bg-white sm:bg-navy-950/40 sm:items-center sm:justify-center sm:p-4 modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setAdding(false);
        }}
      >
        <form noValidate onSubmit={addProject} role="dialog" aria-modal="true" aria-labelledby="add-project-title" className="modal-panel flex flex-col w-full h-full sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg rounded-none sm:rounded-dialog border-0 sm:border border-line bg-white shadow-none sm:shadow-dialog overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 id="add-project-title" className="text-lg font-semibold text-ink">Add project</h2>
            <button type="button" onClick={() => setAdding(false)} disabled={saving} aria-label="Close add project dialog" className="btn-icon p-2">
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 py-4 sm:px-6 sm:py-5 pb-8 sm:pb-5">
            <label className="block">
              <span className="field-label">Project name</span>
              <input required autoFocus value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Project name" className="field" />
            </label>
            <label className="block">
              <span className="field-label">Location <span className="font-normal text-ink-secondary">(optional)</span></span>
              <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="City or site address" className="field" />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Start date <span className="font-normal text-ink-secondary">(optional)</span></span>
                <input type="date" value={tglMulai} onChange={(event) => setTglMulai(event.target.value)} className="field" />
              </label>
              <label className="block">
                <span className="field-label">End date <span className="font-normal text-ink-secondary">(optional)</span></span>
                <input type="date" value={tglSelesai} onChange={(event) => setTglSelesai(event.target.value)} className="field" />
              </label>
            </div>
            <div className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">Cost Estimate file</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-orange-700 transition-colors hover:text-orange-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download template
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-3 py-3 text-sm text-ink-secondary transition hover:border-orange-100 hover:bg-cream focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                <UploadCloud className="h-5 w-5 shrink-0 text-ink-secondary" />
                <span className="min-w-0 flex-1 truncate">{rabFile?.name || 'Choose an Excel or CSV file'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  required
                  onChange={(event) => setRabFile(event.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
            </div>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          </div>
          <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-line bg-canvas px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setAdding(false)} disabled={saving} className="btn-secondary px-4">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-4">
              {saving && <span className="spinner" />}
              {saving ? 'Creating project and saving Cost Estimate...' : 'Create project & upload Cost Estimate'}
            </button>
          </div>
        </form>
      </div>,
      document.body
    )}
    </>
  );
}
