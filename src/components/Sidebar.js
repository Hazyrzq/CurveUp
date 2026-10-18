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

const ROLE_TITLE = {
  manajemen: 'Management',
  pengawas: 'Supervisor',
  mandor: 'Foreman',
};

const ROLE_HOME = {
  manajemen: '/dashboard/manajemen',
  pengawas: '/dashboard/pengawas',
  mandor: '/dashboard/mandor',
};

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

  const itemClass = (active) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl duration-200 ${
      active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
    }`;

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
    if (!nama.trim() || !rabFile) {
      setErr('Enter a project name and choose an RAB file.');
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
        setErr(preview.message || 'Could not read the RAB file.');
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
        setErr(json.message || 'Could not create the project and save its RAB.');
        return;
      }

      setNama('');
      setLokasi('');
      setTglMulai('');
      setTglSelesai('');
      setRabFile(null);
      setAdding(false);
      await reload();
      selectProject(json.proyek_id);
      onMobileClose();
      if (pathname !== ROLE_HOME.manajemen) router.push(ROLE_HOME.manajemen);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/template_rab_curveup.xlsx';
    link.download = 'template_rab_curveup.xlsx';
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
      className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity duration-300 ease-out md:hidden ${
        mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    />
    <aside
      id="dashboard-sidebar"
      aria-label="Main navigation"
      className={`fixed top-0 bottom-0 left-0 z-50 flex h-full max-h-[100dvh] w-[min(84vw,300px)] shrink-0 flex-col border-r border-slate-200 bg-white p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl transition-[transform,box-shadow] duration-300 ease-out md:relative md:inset-auto md:z-auto md:h-full md:w-[220px] md:translate-x-0 md:border-r md:bg-slate-50/70 md:p-4 md:shadow-none lg:w-[250px] lg:p-5 ${
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}
    >
      <div className="mb-5 flex items-start justify-between px-1 md:mb-6 md:px-2">
        <div>
          <p className="text-base font-semibold tracking-tight text-slate-900">CurveUp</p>
          <p className="text-xs text-slate-400">{ROLE_TITLE[role] || ''} workspace</p>
        </div>
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mb-5 flex flex-col gap-1 md:mb-5">
        {role === 'manajemen' && (
          <button
            type="button"
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== ROLE_HOME.manajemen) router.push(ROLE_HOME.manajemen);
            }}
            className={`w-full ${itemClass(isCurrent('/dashboard/manajemen') && !selectedId)}`}
          >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
          </button>
        )}
        {role === 'pengawas' && (
          <button
            type="button"
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== ROLE_HOME.pengawas) router.push(ROLE_HOME.pengawas);
            }}
            className={`w-full ${itemClass(isCurrent('/dashboard/pengawas') && !selectedId)}`}
          >
              <CheckSquare className="w-4 h-4" />
              Dashboard
          </button>
        )}
        {role === 'mandor' && (
          <button
            type="button"
            onClick={() => {
              selectProject(null);
              onMobileClose();
              if (pathname !== '/dashboard/mandor') router.push('/dashboard/mandor');
            }}
            className={`w-full ${itemClass(pathname === '/dashboard/mandor' && !selectedId)}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        )}
      </nav>

      <div className="mb-3 flex items-center justify-between px-1 md:mb-4 md:px-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Projects</p>
          {selectedId && (
            <button
              type="button"
              onClick={() => {
                selectProject(null);
                onMobileClose();
                if (pathname.includes('/laporan-baru')) router.push(ROLE_HOME[role] || '/dashboard/mandor');
              }}
              className="text-[10px] font-medium text-slate-400 hover:text-slate-700 underline"
              title="Clear selected project"
            >
              (Clear selection)
            </button>
          )}
        </div>
        {role === 'manajemen' && (
          <button
            type="button"
            onClick={() => {
              setErr('');
              setAdding(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
            title="Add project"
            aria-label="Add project"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-400 transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 md:mb-4">
        <Search className="h-4 w-4 shrink-0" />
        <span className="sr-only">Search projects</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find project..."
          className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-24 md:pb-3">
        {filtered.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs text-slate-400">No projects found.</p>
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
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className={`block truncate text-xs font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>
                    {p.nama_proyek}
                  </span>
                  {p.lokasi && (
                    <span className={`mt-0.5 block truncate text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {p.lokasi}
                    </span>
                  )}
                </div>
                {active && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/20 text-white hover:bg-white/30"
                    title="Click again to clear selection"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
    {portalReady && adding && role === 'manajemen' && createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/45 p-3 sm:p-4 modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setAdding(false);
        }}
      >
        <form onSubmit={addProject} role="dialog" aria-modal="true" aria-labelledby="add-project-title" className="modal-panel max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 id="add-project-title" className="text-lg font-semibold text-slate-900">Add project</h2>
              <p className="mt-1 text-sm text-slate-500">Enter the project details and attach its RAB file.</p>
            </div>
            <button type="button" onClick={() => setAdding(false)} disabled={saving} aria-label="Close add project dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Project name</span>
              <input required autoFocus value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Project name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Location <span className="font-normal text-slate-400">(optional)</span></span>
              <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="City or site address" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Start date <span className="font-normal text-slate-400">(optional)</span></span>
                <input type="date" value={tglMulai} onChange={(event) => setTglMulai(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">End date <span className="font-normal text-slate-400">(optional)</span></span>
                <input type="date" value={tglSelesai} onChange={(event) => setTglSelesai(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </label>
            </div>
            <div className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">RAB file</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download template
                </button>
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-600 transition hover:border-slate-400">
                <UploadCloud className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{rabFile?.name || 'Choose an Excel or CSV file'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  required
                  onChange={(event) => setRabFile(event.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
              <span className="mt-1 block text-[11px] text-slate-400">The project and its RAB will be saved together.</span>
            </div>
            {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={() => setAdding(false)} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
              {saving && <span className="spinner" />}
              {saving ? 'Creating project and saving RAB...' : 'Create project & upload RAB'}
            </button>
          </div>
        </form>
      </div>,
      document.body
    )}
    </>
  );
}
