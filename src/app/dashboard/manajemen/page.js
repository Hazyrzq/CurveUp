'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import SCurveChart from '@/components/SCurveChart';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import AnimatedCounter from '@/components/AnimatedCounter';
import ImageLightbox from '@/components/ImageLightbox';
import ActionToast from '@/components/ActionToast';
import { useScrollLock } from '@/lib/useScrollLock';
import {
  Wallet,
  TrendingUp,
  Activity,
  GitCompare,
  Search,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  ArrowLeft,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import { useProject } from '@/components/ProjectContext';
import DashboardHeader from '@/components/DashboardHeader';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="chip-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">{icon}</span>
      <div>
        <p className="text-[11px] text-navy-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-navy-800">{value || '—'}</p>
      </div>
    </div>
  );
}

const formatIDR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `IDR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export default function ManajemenDashboard() {
  const router = useRouter();
  const { selectedId, selected, projects, loading: projectsLoading, selectProject, reload } = useProject();
  const [loading, setLoading] = useState(true);
  const [sCurveData, setSCurveData] = useState({ labels: [], rencana: [], realisasi: [] });
  const [proyek, setProyek] = useState(null);
  const [rabItems, setRabItems] = useState([]);
  const [laporan, setLaporan] = useState([]);
  const [activeView, setActiveView] = useState('projects'); // 'projects' | 'detail'
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedCurveWeek, setSelectedCurveWeek] = useState(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    nama_proyek: '',
    lokasi: '',
    tgl_mulai: '',
    tgl_selesai: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  useScrollLock(Boolean(projectToDelete || projectToEdit));

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const toDateInputValue = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const openEditProjectModal = (proj) => {
    if (!proj) return;
    setProjectToEdit(proj);
    setEditForm({
      nama_proyek: proj.nama_proyek || proj.project_name || '',
      lokasi: proj.lokasi || proj.location || '',
      tgl_mulai: toDateInputValue(proj.tgl_mulai || proj.start_date),
      tgl_selesai: toDateInputValue(proj.tgl_selesai || proj.end_date),
    });
  };

  const handleSaveEditProject = async (e) => {
    e.preventDefault();
    if (!projectToEdit || savingEdit) return;
    const trimmedName = String(editForm.nama_proyek || '').trim();
    if (!trimmedName) {
      setToast({
        variant: 'error',
        title: 'Validation error',
        message: 'Project name is required.',
      });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch('/api/proyek', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectToEdit.id,
          nama_proyek: trimmedName,
          lokasi: String(editForm.lokasi || '-').trim() || '-',
          tgl_mulai: editForm.tgl_mulai || null,
          tgl_selesai: editForm.tgl_selesai || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setToast({
          variant: 'error',
          title: 'Update failed',
          message: json.message || 'Could not update the project.',
        });
        return;
      }

      if (proyek && Number(proyek.id) === Number(projectToEdit.id)) {
        setProyek((prev) =>
          prev
            ? {
                ...prev,
                nama_proyek: trimmedName,
                project_name: trimmedName,
                lokasi: String(editForm.lokasi || '-').trim() || '-',
                location: String(editForm.lokasi || '-').trim() || '-',
                tgl_mulai: editForm.tgl_mulai || null,
                start_date: editForm.tgl_mulai || null,
                tgl_selesai: editForm.tgl_selesai || null,
                end_date: editForm.tgl_selesai || null,
              }
            : prev
        );
      }

      setProjectToEdit(null);
      await reload();
      setToast({
        variant: 'success',
        title: 'Project updated',
        message: `Details for "${trimmedName}" have been saved.`,
      });
    } catch {
      setToast({
        variant: 'error',
        title: 'Connection error',
        message: 'Could not connect to the server to update the project.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || deletingProject) return;
    setDeletingProject(true);
    try {
      const res = await fetch('/api/proyek', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectToDelete.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setToast({
          variant: 'error',
          title: 'Delete failed',
          message: json.message || 'Could not delete the project.',
        });
        return;
      }

      const deletedName = projectToDelete.nama_proyek;
      const wasSelected = Number(selectedId) === Number(projectToDelete.id);
      setProjectToDelete(null);
      if (wasSelected) {
        selectProject(null);
        setActiveView('projects');
      }
      await reload();
      setToast({
        variant: 'success',
        title: 'Project deleted',
        message: `"${deletedName}" and its associated Cost Estimate items and reports were deleted.`,
      });
    } catch {
      setToast({
        variant: 'error',
        title: 'Connection error',
        message: 'Could not connect to the server to delete the project.',
      });
    } finally {
      setDeletingProject(false);
    }
  };

  useEffect(() => {
    setSelectedCurveWeek(null);
    setSelectedWorkItemId(null);
    setActiveView(selectedId ? 'detail' : 'projects');
  }, [selectedId]);

  useEffect(() => {
    async function load() {
      if (!selectedId) {
        setProyek(null);
        setRabItems([]);
        setLaporan([]);
        setSCurveData({ labels: [], rencana: [], realisasi: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = `proyek_id=${selectedId}`;
        const [kurvaRes, pekerjaanRes, progresRes] = await Promise.all([
          fetch(`/api/kurva-s?${q}`),
          fetch(`/api/pekerjaan?${q}`),
          fetch(`/api/progres?${q}`),
        ]);

        const kurva = await kurvaRes.json();
        const pekerjaan = await pekerjaanRes.json();
        const progres = await progresRes.json();

        if (kurva.success) {
          setSCurveData({
            labels: kurva.labels || [],
            rencana: kurva.rencana || [],
            realisasi: kurva.realisasi || [],
          });
        }
        if (pekerjaan.success) {
          setProyek(pekerjaan.proyek);
          setRabItems(pekerjaan.data || []);
        }
        if (progres.success) {
          setLaporan(progres.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedId]);

  const lastValue = (arr) => {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (arr[i] != null) return arr[i];
    }
    return null;
  };

  let latestRealisasiIndex = -1;
  for (let i = sCurveData.realisasi.length - 1; i >= 0; i -= 1) {
    if (sCurveData.realisasi[i] != null) {
      latestRealisasiIndex = i;
      break;
    }
  }

  const lastRealisasi = latestRealisasiIndex >= 0 ? sCurveData.realisasi[latestRealisasiIndex] : null;
  const plannedAtCutoff = latestRealisasiIndex >= 0 ? sCurveData.rencana[latestRealisasiIndex] : null;
  const currentWeekNumber = latestRealisasiIndex >= 0 ? latestRealisasiIndex + 1 : null;
  const totalRencana = lastValue(sCurveData.rencana);
  const deviasi =
    plannedAtCutoff != null && lastRealisasi != null
      ? Number((lastRealisasi - plannedAtCutoff).toFixed(2))
      : null;

  // Hitung durasi rencana kontrak awal (minggu rencana pertama yang mencapai >= 99.9% atau panjang rencana)
  const originalPlannedWeeks = sCurveData.rencana.findIndex((r) => r >= 99.9) >= 0
    ? sCurveData.rencana.findIndex((r) => r >= 99.9) + 1
    : sCurveData.rencana.length;

  let timeDelayWeeks = 0;
  let timeDelayDays = 0;
  let delayStatus = 'no_data'; // 'no_data' | 'on_track' | 'ahead' | 'delayed'
  let delayBadgeLabel = 'No Progress Yet';
  let delaySummaryText =
    'No approved progress reports have been recorded yet. Submit and approve weekly reports to compare actual progress against the planned S-Curve.';

  if (lastRealisasi != null && currentWeekNumber != null) {
    if (currentWeekNumber > originalPlannedWeeks) {
      timeDelayWeeks = currentWeekNumber - originalPlannedWeeks;
      timeDelayDays = timeDelayWeeks * 7;
      delayStatus = 'delayed';
      delayBadgeLabel = `Delayed +${timeDelayWeeks} Week${timeDelayWeeks === 1 ? '' : 's'}`;
      delaySummaryText = `The project is 100% completed, but exceeded the initial contract schedule (${originalPlannedWeeks} weeks) by ${timeDelayWeeks} weeks (${timeDelayDays} days).`;
    } else if (deviasi != null && Math.abs(deviasi) <= 1) {
      timeDelayWeeks = 0;
      timeDelayDays = 0;
      delayStatus = 'on_track';
      delayBadgeLabel = 'On Schedule';
      delaySummaryText = `Physical progress is ${lastRealisasi}%, running on schedule with the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber}.`;
    } else if (deviasi != null && deviasi > 1) {
      delayStatus = 'ahead';
      let aheadEqWeek = currentWeekNumber;
      for (let i = 0; i < sCurveData.rencana.length; i++) {
        if (sCurveData.rencana[i] <= lastRealisasi) {
          aheadEqWeek = i + 1;
        }
      }
      const weekLead = Math.max(0, aheadEqWeek - currentWeekNumber);
      if (weekLead > 0) {
        timeDelayWeeks = weekLead;
        timeDelayDays = weekLead * 7;
        delayBadgeLabel = `Ahead of Schedule · +${timeDelayWeeks} Week${timeDelayWeeks === 1 ? '' : 's'}`;
        delaySummaryText = `Current actual progress is ${lastRealisasi}%, exceeding the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber} (+${deviasi}%). Progress has already reached Week ${aheadEqWeek} targets — ahead of schedule by approximately ${timeDelayWeeks} week${timeDelayWeeks === 1 ? '' : 's'} (${timeDelayDays} days).`;
      } else {
        const nextPlanned = sCurveData.rencana[currentWeekNumber] ?? totalRencana ?? plannedAtCutoff;
        const weeklyStep = Math.max(1, (nextPlanned || 0) - (plannedAtCutoff || 0));
        timeDelayDays = Math.max(1, Math.round((deviasi / weeklyStep) * 7));
        timeDelayWeeks = Math.floor(timeDelayDays / 7);
        delayBadgeLabel =
          timeDelayWeeks > 0
            ? `Ahead of Schedule · +${timeDelayWeeks} Week${timeDelayWeeks === 1 ? '' : 's'}`
            : `Ahead of Schedule · +${timeDelayDays} Day${timeDelayDays === 1 ? '' : 's'}`;
        delaySummaryText = `Actual progress is ${lastRealisasi}%, exceeding the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber} (+${deviasi}%), with an estimated lead time of ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}.`;
      }
    } else {
      delayStatus = 'delayed';
      let eqWeek = 0;
      for (let i = 0; i < sCurveData.rencana.length; i++) {
        if (sCurveData.rencana[i] >= lastRealisasi) {
          eqWeek = i + 1;
          break;
        }
      }
      if (eqWeek === 0 && lastRealisasi >= (totalRencana || 99.9)) {
        eqWeek = originalPlannedWeeks;
      }

      const weekDiff = Math.max(0, currentWeekNumber - eqWeek);
      if (weekDiff > 0) {
        timeDelayWeeks = weekDiff;
        timeDelayDays = weekDiff * 7;
        delayBadgeLabel = `Behind by ~${timeDelayWeeks} Week${timeDelayWeeks === 1 ? '' : 's'}`;
        delaySummaryText = `Current actual progress is ${lastRealisasi}%, lagging behind the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber} (${deviasi}%). Progress is equivalent to Week ${eqWeek} targets, resulting in an estimated delay of ${timeDelayWeeks} week${timeDelayWeeks === 1 ? '' : 's'} (${timeDelayDays} days).`;
      } else {
        const prevPlanned = currentWeekNumber > 1 ? sCurveData.rencana[currentWeekNumber - 2] : 0;
        const weeklyStep = Math.max(1, (plannedAtCutoff || 0) - (prevPlanned || 0));
        timeDelayDays = Math.max(1, Math.round((Math.abs(deviasi || 0) / weeklyStep) * 7));
        timeDelayWeeks = Math.floor(timeDelayDays / 7);
        delayBadgeLabel =
          timeDelayWeeks > 0
            ? `Behind by ~${timeDelayWeeks} Week${timeDelayWeeks === 1 ? '' : 's'}`
            : `Behind by ~${timeDelayDays} Day${timeDelayDays === 1 ? '' : 's'}`;
        delaySummaryText = `Actual progress is ${lastRealisasi}%, below the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber} (${deviasi}%), with an estimated delay of ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}.`;
      }
    }
  }

  const clampPct = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const plannedDisplayValue = plannedAtCutoff != null ? plannedAtCutoff : totalRencana;
  const delayDurationLabel =
    timeDelayWeeks > 0
      ? `${timeDelayWeeks} week${timeDelayWeeks === 1 ? '' : 's'}`
      : `${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`;
  const delayBigValue =
    delayStatus === 'no_data'
      ? 'No data yet'
      : delayStatus === 'on_track'
      ? 'On schedule'
      : delayStatus === 'ahead'
      ? `+${delayDurationLabel}`
      : delayDurationLabel;
  const delayBigCaption =
    delayStatus === 'delayed'
      ? `Behind by ≈ ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`
      : delayStatus === 'ahead'
      ? `Ahead by ≈ ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`
      : delayStatus === 'on_track'
      ? 'No delay reported'
      : 'Awaiting progress data';
  const scheduleTone =
    delayStatus === 'delayed'
      ? {
          chip: 'bg-rose-50 text-rose-700 border border-rose-200/80',
          value: 'text-rose-700',
          icon: (
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          ),
        }
      : delayStatus === 'ahead'
      ? {
          chip: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
          value: 'text-emerald-700',
          icon: (
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ),
        }
      : delayStatus === 'on_track'
      ? {
          chip: 'bg-amber-50 text-amber-700 border border-amber-200/80',
          value: 'text-amber-700',
          icon: <span className="inline-flex rounded-full h-2 w-2 bg-amber-500 mr-0.5"></span>,
        }
      : {
          chip: 'bg-navy-100 text-navy-600 border border-navy-200',
          value: 'text-navy-500',
          icon: <span className="inline-flex rounded-full h-2 w-2 bg-navy-400 mr-0.5"></span>,
        };

  const totalBobot  = rabItems.reduce((s, i) => s + Number(i.bobot_persen || 0), 0);
  const pendingCount  = laporan.filter((l) => l.status_verifikasi === 'pending').length;
  const approvedCount = laporan.filter((l) => l.status_verifikasi === 'approved').length;
  const rejectedCount = laporan.filter((l) => l.status_verifikasi === 'rejected').length;
  const approvedProgressByItem = new Map();
  laporan.forEach((report) => {
    if (report.status_verifikasi !== 'approved') return;
    const itemId = String(report.item_pekerjaan_id);
    approvedProgressByItem.set(
      itemId,
      (approvedProgressByItem.get(itemId) || 0) + Number(report.realisasi_bobot || 0)
    );
  });
  const query = projectQuery.trim().toLowerCase();
  const visibleProjects = projects.filter((p) =>
    `${p.nama_proyek} ${p.lokasi || ''}`.toLowerCase().includes(query)
  );
  const totalRabItems = projects.reduce((s, p) => s + Number(p.rab_count || 0), 0);

  const activeProject = proyek || selected;
  const selectedWorkItem = rabItems.find((item) => String(item.id) === String(selectedWorkItemId));
  const selectedWorkItemReports = laporan
    .filter((report) => String(report.item_pekerjaan_id) === String(selectedWorkItemId))
    .sort((a, b) => Number(a.minggu_ke) - Number(b.minggu_ke));
  const selectedWorkItemApprovedProgress = selectedWorkItem
    ? Number((approvedProgressByItem.get(String(selectedWorkItem.id)) || 0).toFixed(2))
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        role="manajemen"
        compactTitle
        title={
          activeView === 'detail' && selectedWorkItem
            ? selectedWorkItem.nama_pekerjaan
            : activeView === 'detail' && activeProject
            ? activeProject.nama_proyek
            : 'Management Dashboard'
        }
        subtitle={
          activeView === 'detail' && selectedWorkItem
            ? `${selectedWorkItem.kode_pekerjaan} · Review records and evidence`
            : activeView === 'detail' && activeProject
            ? `${activeProject.lokasi || 'Active project'} · ${rabItems.length} Cost Estimate items · ${laporan.length} reports`
            : `${projects.length} projects · ${totalRabItems} Cost Estimate items`
        }
      />

      {/* ── Tab Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Management dashboard views" className="seg grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'projects'}
            onClick={() => {
              setSelectedWorkItemId(null);
              selectProject(null);
              setActiveView('projects');
            }}
            className={`seg-item px-2 sm:px-4 ${activeView === 'projects' ? 'seg-active' : ''}`}
          >
            <FolderKanban className="h-4 w-4" />
            All Projects
            <span className={`rounded-full px-1.5 text-[11px] font-semibold ${activeView === 'projects' ? 'bg-white/25 text-white' : 'bg-navy-100 text-navy-500'}`}>{projects.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'detail'}
            onClick={() => { if (selectedId) setActiveView('detail'); }}
            disabled={!selectedId}
            className={`seg-item px-2 sm:px-4 ${
              activeView === 'detail'
                ? 'seg-active'
                : selectedId
                ? ''
                : 'cursor-not-allowed !text-navy-300'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Project Detail
            {selectedId && activeProject && (
              <span className={`max-w-[100px] truncate text-[11px] font-medium ${activeView === 'detail' ? 'text-white/85' : 'text-brand-700'}`}>
                {activeProject.nama_proyek}
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-navy-400">
          {activeView === 'projects'
            ? 'Click “Open” on a project to view its details and S-Curve.'
            : selectedWorkItem
            ? 'Review all reports and evidence submitted for this work item.'
            : 'Showing details and S-Curve for the selected project.'}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* VIEW: DAFTAR PROYEK                               */}
      {/* ══════════════════════════════════════════════════ */}
      {activeView === 'projects' && (
        <div className="anim-content-enter space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 stagger-grid">
            <StatCard
              icon={<FolderKanban className="h-4 w-4" />}
              tone="orange"
              label="Projects"
              value={projectsLoading ? '—' : projects.length}
            />
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              tone="sky"
              label="Cost Estimate Items"
              value={projectsLoading ? '—' : totalRabItems}
            />
            <div className="surface card-hover col-span-2 flex min-w-0 items-center gap-3 p-4 sm:col-span-1 sm:p-5">
              <span className="chip-teal flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-navy-500">Current Project</p>
                <p className="mt-1 truncate text-base font-semibold text-navy-800">
                  {selected?.nama_proyek || 'None selected'}
                </p>
              </div>
            </div>
          </div>

          <section className="overflow-hidden surface">
          <div className="flex flex-col gap-3 border-b border-navy-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="text-sm font-semibold text-navy-800">All Projects</h3>
              <p className="mt-0.5 text-xs text-navy-500">
                Choose a project to view its progress, S-Curve, and work items.
              </p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-full border border-navy-200 bg-white px-3.5 py-2 shadow-sm sm:max-w-xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition">
              <Search className="h-4 w-4 shrink-0 text-navy-400" />
              <input
                type="search"
                value={projectQuery}
                onChange={(e) => setProjectQuery(e.target.value)}
                placeholder="Search projects or location..."
                className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:text-navy-400"
              />
            </label>
          </div>
          <div className="p-3 sm:p-5">
            {projectsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-40 rounded-xl shimmer border border-navy-100" />
                ))}
              </div>
            ) : visibleProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-grid">
                {visibleProjects.map((project) => {
                  const active = Number(selectedId) === Number(project.id);
                  return (
                    <article
                      key={project.id}
                      className={`card-hover flex min-w-0 flex-col rounded-2xl border p-5 ${
                        active ? 'border-brand-300 bg-brand-50/50 shadow-soft ring-1 ring-brand-200/60' : 'border-navy-200/70 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="chip-orange flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                          <FolderKanban className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="break-words text-sm font-semibold leading-5 text-navy-800">
                            {project.nama_proyek}
                          </h4>
                          <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-navy-500">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {project.lokasi || 'Location not set'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-navy-100 bg-navy-50/70 px-3.5 py-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-navy-400">Cost Estimate Items</p>
                          <p className="mt-0.5 text-sm font-semibold text-navy-800">{Number(project.rab_count || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-navy-400">Start Date</p>
                          <p className="mt-0.5 text-xs font-medium text-navy-700">{formatDate(project.tgl_mulai)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/70 px-2 py-0.5 text-[11px] font-medium text-brand-700"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" />Selected project</span>
                        ) : <span />}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditProjectModal(project)}
                            aria-label={`Edit ${project.nama_proyek}`}
                            title="Edit project details"
                            className="btn-secondary rounded-lg px-2.5 py-2 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectToDelete(project)}
                            aria-label={`Delete ${project.nama_proyek}`}
                            title="Delete project"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              selectProject(project.id);
                              setActiveView('detail');
                            }}
                            className="btn-primary rounded-lg px-3 py-2 text-xs"
                          >
                            Open project
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
                <span className="chip-orange flex h-12 w-12 items-center justify-center rounded-2xl">
                  <FolderKanban className="h-6 w-6" />
                </span>
                <h4 className="mt-4 text-sm font-semibold text-navy-800">
                  {projects.length ? 'No projects match your search.' : 'No projects yet'}
                </h4>
                <p className="mt-1 max-w-sm text-xs leading-5 text-navy-500">
                  {projects.length
                    ? 'Try another project name or location.'
                    : 'Create a project with the plus button in the sidebar and upload its Cost Estimate at the same time.'}
                </p>
              </div>
            )}
          </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* VIEW: DETAIL PROYEK + KURVA-S                     */}
      {/* ══════════════════════════════════════════════════ */}
      {activeView === 'detail' && !selectedId && (
        <div className="anim-content-enter surface p-10 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-brand-300" />
          <h3 className="mt-3 text-base font-semibold text-navy-800">No project selected</h3>
          <p className="mt-1 text-xs text-navy-500">
            Pick a project from the list or sidebar to view its S-Curve and work items.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('projects')}
            className="btn-primary mt-4 px-4 py-2.5 text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            View All Projects
          </button>
        </div>
      )}

      {activeView === 'detail' && selectedId && (
        <div key={`project-detail-${selectedId}`} className="anim-content-enter space-y-5">
          {/* Top navigation & Delete Project button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedWorkItem) setSelectedWorkItemId(null);
                else {
                  selectProject(null);
                  setActiveView('projects');
                }
              }}
              className="btn-secondary rounded-full px-3.5 py-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {selectedWorkItem ? 'Back to Work Items' : 'Back to Projects'}
            </button>
            {!selectedWorkItem && activeProject && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditProjectModal(activeProject)}
                  className="btn-secondary rounded-full px-3.5 py-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Project
                </button>
                <button
                  type="button"
                  onClick={() => setProjectToDelete(activeProject)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:border-rose-300 hover:bg-rose-50 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Project
                </button>
              </div>
            )}
          </div>

          {/* ── Stat Cards ── */}
          {!selectedWorkItem && (
            <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 stagger-grid">
              <StatCard
                icon={<Wallet className="w-4 h-4" />}
                tone="sky"
                label="Cost Estimate Weight"
                value={loading ? '—' : `${totalBobot.toFixed(1)}%`}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                tone="teal"
                label={currentWeekNumber ? `Planned (W${currentWeekNumber})` : 'Planned Target'}
                value={loading ? '—' : (plannedAtCutoff != null ? `${plannedAtCutoff}%` : (totalRencana != null ? `${totalRencana}%` : '—'))}
              />
              <StatCard
                icon={<Activity className="w-4 h-4" />}
                tone="orange"
                label={currentWeekNumber ? `Actual (W${currentWeekNumber})` : 'Actual (latest)'}
                value={loading ? '—' : lastRealisasi != null ? `${lastRealisasi}%` : '—'}
              />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="Schedule Variance"
                value={
                  loading
                    ? '—'
                    : delayStatus === 'no_data'
                    ? 'No Data'
                    : delayStatus === 'delayed'
                    ? timeDelayWeeks > 0 ? `Behind -${timeDelayWeeks}W` : `Behind -${timeDelayDays}D`
                    : delayStatus === 'ahead'
                    ? timeDelayWeeks > 0 ? `Ahead +${timeDelayWeeks}W` : `Ahead +${timeDelayDays}D`
                    : 'On Schedule'
                }
                hint={
                  loading
                    ? undefined
                    : deviasi != null
                    ? `${deviasi > 0 ? '+' : ''}${deviasi}%`
                    : 'Awaiting reports'
                }
                tone={
                  delayStatus === 'delayed'
                    ? 'rose'
                    : delayStatus === 'ahead'
                    ? 'emerald'
                    : delayStatus === 'on_track'
                    ? 'amber'
                    : 'slate'
                }
              />
            </div>

            {/* ── Schedule Status: Actual vs Planned ── */}
            <section className="anim-content-enter overflow-hidden surface">
              <div className="flex flex-col gap-3 border-b border-navy-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">Schedule Status</p>
                  <h3 className="mt-1 text-sm font-semibold text-navy-800">Actual vs Planned Status</h3>
                  <p className="mt-0.5 text-xs text-navy-500">
                    {currentWeekNumber ? `As of Week ${currentWeekNumber}. ` : ''}
                    A quick read of how far the actual work is from the plan.
                  </p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${scheduleTone.chip}`}>
                  {scheduleTone.icon}
                  {loading ? 'Loading...' : delayBadgeLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-navy-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {/* Actual */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-navy-500">Actual progress</p>
                    <Activity className="h-4 w-4 text-brand-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-navy-800">
                    {loading ? '—' : lastRealisasi != null ? <AnimatedCounter value={lastRealisasi} suffix="%" /> : '—'}
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out" style={{ width: `${clampPct(lastRealisasi)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-navy-400">Work completed so far</p>
                </div>

                {/* Planned */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-navy-500">
                      {currentWeekNumber ? `Planned target (W${currentWeekNumber})` : 'Planned target'}
                    </p>
                    <TrendingUp className="h-4 w-4 text-teal-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-navy-800">
                    {loading ? '—' : plannedDisplayValue != null ? <AnimatedCounter value={plannedDisplayValue} suffix="%" /> : '—'}
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-700 ease-out" style={{ width: `${clampPct(plannedDisplayValue)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-navy-400">What should be done by now</p>
                </div>

                {/* Status / Variance */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-navy-500">
                      {delayStatus === 'ahead'
                        ? 'Ahead of Schedule'
                        : delayStatus === 'delayed'
                        ? 'Delay'
                        : 'Schedule Status'}
                    </p>
                    <Clock className="h-4 w-4 text-navy-300" />
                  </div>
                  <p className={`mt-2 text-2xl font-semibold tracking-tight ${scheduleTone.value}`}>
                    {loading ? '—' : delayBigValue}
                  </p>
                  <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${scheduleTone.value}`}>
                    {scheduleTone.icon}
                    {loading ? 'Loading...' : delayBigCaption}
                  </p>
                  <p className="mt-2 text-[11px] text-navy-400">
                    {deviasi != null
                      ? `${deviasi > 0 ? '+' : ''}${deviasi}% vs plan`
                      : 'No approved reports yet'}
                  </p>
                </div>
              </div>

              {!loading && delaySummaryText && (
                <p className="border-t border-navy-100 bg-navy-50/60 px-4 py-3 text-xs leading-5 text-navy-600 sm:px-5">
                  {delaySummaryText}
                </p>
              )}
            </section>
            </>
          )}

          {/* Item review records */}
          {selectedWorkItem && <section className="anim-content-enter overflow-hidden surface">
            <div className="border-b border-navy-100 px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">
                Work Item · {selectedWorkItem.kode_pekerjaan}
              </p>
              <h3 className="mt-1 text-base font-semibold text-navy-800">{selectedWorkItem.nama_pekerjaan}</h3>
              <p className="mt-0.5 text-xs text-navy-500">
                {selectedWorkItem.volume ? `${selectedWorkItem.volume} ${selectedWorkItem.satuan || ''} · ` : ''}
                Cost Estimate weight {Number(selectedWorkItem.bobot_persen).toFixed(2)}% ·{' '}
                {selectedWorkItemApprovedProgress}% approved · {selectedWorkItemReports.length} reports
              </p>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-navy-400">Loading reports...</p>
            ) : selectedWorkItemReports.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-navy-400">
                No progress reports have been submitted for this work item yet.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="table-soft w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-navy-50/80 text-xs text-navy-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Week / Date</th>
                        <th className="px-4 py-3 font-medium">Foreman</th>
                        <th className="px-4 py-3 text-right font-medium">Actual</th>
                        <th className="px-4 py-3 font-medium">Review</th>
                        <th className="px-4 py-3 font-medium">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {selectedWorkItemReports.map((report) => (
                        <tr key={report.id} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium text-navy-800">Week {report.minggu_ke}</p>
                            <p className="mt-0.5 text-xs text-navy-400">
                              {formatDate(report.tgl_laporan)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-600">
                            <p>{report.mandor_nama || 'Foreman'}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy-800">
                            {Number(report.realisasi_bobot)}%
                          </td>
                          <td className="max-w-[260px] px-4 py-3">
                            <StatusBadge status={report.status_verifikasi} />
                            {report.pengawas_nama && (
                              <p className="mt-1 text-xs text-navy-500">Reviewed by {report.pengawas_nama}</p>
                            )}
                            {report.catatan_pengawas ? (
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-navy-600">
                                {report.catatan_pengawas}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-navy-400">No review note</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {report.foto_bukti ? (
                              <button
                                type="button"
                                onClick={() => setLightboxPhoto({
                                  src: report.foto_bukti,
                                  alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                                  subtitle: `Submitted by ${report.mandor_nama || 'Foreman'} on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                                })}
                                className="group relative block overflow-hidden rounded-lg border border-navy-200 transition hover:border-brand-500 focus:outline-none"
                              >
                                <img
                                  src={report.foto_bukti}
                                  alt={`Evidence for ${report.nama_pekerjaan}, week ${report.minggu_ke}`}
                                  className="h-16 w-24 rounded-lg object-cover transition duration-200 group-hover:scale-105"
                                />
                              </button>
                            ) : (
                              <span className="text-xs text-navy-400">No photo attached</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-navy-100 md:hidden">
                  {selectedWorkItemReports.map((report) => (
                    <article key={report.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold leading-5 text-navy-800">
                            Week {report.minggu_ke}
                          </h4>
                          <p className="mt-1 text-xs text-navy-500">{formatDate(report.tgl_laporan)}</p>
                        </div>
                        <StatusBadge status={report.status_verifikasi} />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-navy-500">
                        <span className="truncate">{report.mandor_nama || 'Foreman'}</span>
                        <span className="shrink-0 font-semibold text-navy-800">
                          {Number(report.realisasi_bobot)}% actual
                        </span>
                      </div>
                      {report.pengawas_nama && (
                        <p className="text-xs text-navy-500">Reviewed by {report.pengawas_nama}</p>
                      )}
                      <div className="rounded-lg bg-navy-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">Supervisor note</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-navy-700">
                          {report.catatan_pengawas || 'No review note'}
                        </p>
                      </div>
                      {report.foto_bukti ? (
                        <button
                          type="button"
                          onClick={() => setLightboxPhoto({
                            src: report.foto_bukti,
                            alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                            subtitle: `Submitted by ${report.mandor_nama || 'Foreman'} on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                          })}
                          className="group relative block overflow-hidden rounded-lg border border-navy-200 transition hover:border-brand-500 focus:outline-none"
                        >
                          <img
                            src={report.foto_bukti}
                            alt={`Evidence for ${report.nama_pekerjaan}, week ${report.minggu_ke}`}
                            className="h-28 w-40 rounded-lg object-cover transition duration-200 group-hover:scale-105"
                          />
                          <span className="mt-1 block text-left text-xs font-medium text-brand-700">Tap to enlarge photo</span>
                        </button>
                      ) : (
                        <p className="text-xs text-navy-400">No photo evidence attached.</p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>}

          {/* ── Main 2-column grid ── */}
          {!selectedWorkItem && <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">

            {/* Left column */}
            <div className="space-y-5">
              {/* Kurva-S */}
              <section className="overflow-hidden surface">
                <div className="border-b border-navy-100 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">Progress Visualization</p>
                  <h3 className="mt-1 text-sm font-semibold text-navy-800">S-Curve (Planned vs Actual)</h3>
                  <p className="mt-0.5 text-xs text-navy-500">
                    Weekly cumulative comparison. Actual progress includes approved reports from this and earlier weeks.
                  </p>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="flex h-72 items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-navy-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-brand-500" />
                        <span className="text-xs">Loading data...</span>
                      </div>
                    </div>
                  ) : (
                    <SCurveChart
                      key={selectedId || 'empty'}
                      dataRencana={sCurveData.rencana}
                      dataRealisasi={sCurveData.realisasi}
                      labels={sCurveData.labels}
                      reports={laporan}
                      selectedWeek={selectedCurveWeek}
                      onWeekSelect={setSelectedCurveWeek}
                    />
                  )}
                </div>
                {selectedCurveWeek && (
                  <div className="border-t border-navy-100 bg-navy-50/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">
                          Selected week
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-navy-800">
                          Week {selectedCurveWeek} reported work
                        </h4>
                      </div>
                      <p className="text-xs text-navy-500">
                        Planned cumulative: {sCurveData.rencana[selectedCurveWeek - 1] ?? 0}% ·
                        {' '}Actual cumulative: {sCurveData.realisasi[selectedCurveWeek - 1] ?? '—'}%
                      </p>
                    </div>
                    {laporan.filter((report) => Number(report.minggu_ke) === selectedCurveWeek).length ? (
                      <div className="mt-3 divide-y divide-navy-200 overflow-hidden surface">
                        {laporan
                          .filter((report) => Number(report.minggu_ke) === selectedCurveWeek)
                          .map((report) => (
                            <article
                              key={report.id}
                              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                            >
                              <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-navy-800">
                                  <span className="mr-1 font-mono text-xs text-navy-400">
                                    {report.kode_pekerjaan}
                                  </span>
                                  {report.nama_pekerjaan}
                                </p>
                                <p className="mt-1 text-xs text-navy-500">
                                  {Number(report.realisasi_bobot)}% reported · {report.mandor_nama || 'Foreman'} ·{' '}
                                  {formatDate(report.tgl_laporan)}
                                </p>
                                {report.catatan_pengawas && (
                                  <p className="mt-1 whitespace-pre-wrap break-words text-xs text-navy-500">
                                    Supervisor note: {report.catatan_pengawas}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                <StatusBadge status={report.status_verifikasi} />
                                {report.foto_bukti && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxPhoto({
                                      src: report.foto_bukti,
                                      alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                                      subtitle: `Submitted by ${report.mandor_nama || 'Foreman'} on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                                    })}
                                    className="text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900 transition"
                                  >
                                    View evidence
                                  </button>
                                )}
                              </div>
                            </article>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl border border-dashed border-navy-300 bg-white px-4 py-5 text-center text-sm text-navy-500">
                        No reports were submitted for this week.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* Cost Estimate items table */}
              <section className="overflow-hidden surface">
                <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">Cost Estimate</p>
                    <h3 className="mt-1 text-sm font-semibold text-navy-800">Work Items</h3>
                    <p className="mt-0.5 text-xs text-navy-500">Select an item to view its review records and evidence.</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200/70">
                    {loading ? '—' : rabItems.length} items
                  </span>
                </div>
                {loading ? (
                  <p className="px-5 py-10 text-center text-sm text-navy-400">Loading...</p>
                ) : rabItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-14">
                    <FileText className="h-8 w-8 text-navy-200" />
                    <p className="text-sm text-navy-400">No work items yet for this project.</p>
                  </div>
                ) : (
                  <>
                  <div className="hidden max-h-[380px] overflow-auto md:block">
                    <table className="table-soft w-full min-w-[760px] text-left text-sm">
                      <thead className="sticky top-0 z-[1] bg-navy-50 text-xs text-navy-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
                        <tr>
                          <th className="px-5 py-3 font-medium">Code</th>
                          <th className="px-5 py-3 font-medium">Work Item</th>
                          <th className="px-5 py-3 text-right font-medium">Volume</th>
                          <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                          <th className="px-5 py-3 text-right font-medium">Total Price</th>
                          <th className="px-5 py-3 text-right font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-100">
                        {rabItems.map((item) => (
                          <tr
                            key={item.id}
                            tabIndex={0}
                            role="button"
                            onClick={() => setSelectedWorkItemId(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedWorkItemId(item.id);
                              }
                            }}
                            className="cursor-pointer focus:bg-brand-50 focus:outline-none"
                            aria-label={`View reports for ${item.kode_pekerjaan} ${item.nama_pekerjaan}`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-navy-500">{item.kode_pekerjaan}</td>
                            <td className="px-5 py-3 font-medium text-navy-800">
                              <span className="flex items-center justify-between gap-3">
                                <span>{item.nama_pekerjaan}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-navy-400" />
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-xs tabular-nums text-navy-500">
                              {item.volume ? `${item.volume} ${item.satuan || ''}` : '—'}
                            </td>
                            <td className="px-5 py-3 text-right text-xs tabular-nums text-navy-500 whitespace-nowrap">
                              {formatIDR(item.harga_satuan ?? item.unit_price)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs tabular-nums text-navy-700 whitespace-nowrap">
                              {formatIDR(item.total_harga ?? item.total_price)}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">
                              <span className="font-semibold text-brand-700">{item.bobot_persen}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-brand-50/80 text-xs backdrop-blur">
                        <tr>
                          <td className="px-5 py-3" />
                          <td className="px-5 py-3 font-semibold text-navy-800" colSpan={3}>Total</td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-navy-800 whitespace-nowrap">
                            {formatIDR(rabItems.reduce((sum, it) => sum + Number(it.total_harga ?? it.total_price ?? 0), 0))}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-brand-700">
                            {rabItems.reduce((sum, it) => sum + Number(it.bobot_persen || 0), 0).toFixed(2)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="divide-y divide-navy-100 md:hidden">
                    {rabItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedWorkItemId(item.id)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-brand-50/60 focus:bg-brand-50 focus:outline-none"
                        aria-label={`View reports for ${item.kode_pekerjaan} ${item.nama_pekerjaan}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-[11px] text-navy-400">{item.kode_pekerjaan}</span>
                          <span className="mt-1 block break-words text-sm font-medium leading-5 text-navy-800">
                            {item.nama_pekerjaan}
                          </span>
                          <span className="mt-1 block text-xs text-navy-500">
                            {item.volume ? `${item.volume} ${item.satuan || ''} · ` : ''}
                            Weight {Number(item.bobot_persen).toFixed(2)}%
                          </span>
                          <span className="mt-0.5 block text-xs text-navy-400">
                            {formatIDR(item.harga_satuan ?? item.unit_price)} / unit · Total {formatIDR(item.total_harga ?? item.total_price)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-navy-400" />
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </section>
            </div>

            {/* Right column: Info proyek + ringkasan laporan */}
            <aside className="space-y-4">
              {/* Info Proyek */}
              <div className="overflow-hidden surface">
                <div className="border-b border-navy-100 px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">Project Info</p>
                </div>
                <dl className="divide-y divide-navy-100">
                  <InfoRow
                    icon={<FolderKanban className="h-4 w-4" />}
                    label="Project Name"
                    value={activeProject?.nama_proyek}
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Location"
                    value={activeProject?.lokasi}
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Start Date"
                    value={formatDate(activeProject?.tgl_mulai)}
                  />
                  {activeProject?.tgl_selesai && (
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="End Date"
                      value={formatDate(activeProject?.tgl_selesai)}
                    />
                  )}
                  <InfoRow
                    icon={<Layers className="h-4 w-4" />}
                    label="Cost Estimate Items"
                    value={loading ? '—' : `${rabItems.length} items`}
                  />
                </dl>
              </div>

              {/* Report summary */}
              <div className="overflow-hidden surface">
                <div className="border-b border-navy-100 px-4 py-3.5 sm:px-5">
                  <h3 className="text-sm font-semibold text-navy-800">Report summary</h3>
                </div>
                <div className="divide-y divide-navy-100 px-4 sm:px-5">
                  {[
                    { label: 'Pending review', value: pendingCount, tone: 'text-amber-700' },
                    { label: 'Approved', value: approvedCount, tone: 'text-emerald-700' },
                    { label: 'Rejected', value: rejectedCount, tone: 'text-rose-700' },
                    { label: 'Total reports', value: laporan.length, tone: 'text-navy-800' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-navy-600">{row.label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${row.tone}`}>
                        {loading ? '—' : row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deviasi indicator */}
              {!loading && (
                <div className="surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-500">Schedule variance</p>
                      <p className={`mt-1 text-sm font-semibold ${scheduleTone.value}`}>
                        {delayStatus === 'ahead'
                          ? 'Ahead of schedule'
                          : delayStatus === 'delayed'
                          ? 'Behind schedule'
                          : delayStatus === 'on_track'
                          ? 'On schedule'
                          : 'No progress yet'}
                      </p>
                    </div>
                    <p className={`shrink-0 text-xl font-semibold tabular-nums tracking-tight ${scheduleTone.value}`}>
                      {deviasi != null ? `${deviasi > 0 ? '+' : ''}${deviasi}%` : '—'}
                    </p>
                  </div>
                  <p className="mt-2 border-t border-navy-100 pt-2 text-xs leading-5 text-navy-500">
                    {deviasi != null
                      ? `Difference between actual progress (${lastRealisasi}%) and planned progress (${plannedAtCutoff}%)${currentWeekNumber ? ` at Week ${currentWeekNumber}` : ''}.`
                      : 'No approved progress reports yet for this project.'}
                  </p>
                </div>
              )}
            </aside>
          </div>}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <ActionToast
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Edit Project Modal */}
      {portalReady &&
        projectToEdit &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/30 p-4 backdrop-blur-sm anim-fade"
            onClick={() => {
              if (!savingEdit) setProjectToEdit(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-project-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lift ring-1 ring-navy-900/5 anim-scale"
            >
              <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Pencil className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="edit-project-title" className="text-base font-semibold text-navy-800">
                      Edit Project Details
                    </h3>
                    <p className="text-xs text-navy-500">
                      Update the project name, location, or contract schedule dates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setProjectToEdit(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 hover:text-navy-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditProject}>
                <div className="space-y-4 px-5 py-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-navy-700">
                      Project Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.nama_proyek}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, nama_proyek: e.target.value }))
                      }
                      placeholder="Enter project name"
                      className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-base text-navy-800 sm:text-sm outline-none hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-navy-700">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editForm.lokasi}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, lokasi: e.target.value }))
                      }
                      placeholder="Enter project site location"
                      className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-base text-navy-800 sm:text-sm outline-none hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-navy-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editForm.tgl_mulai}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, tgl_mulai: e.target.value }))
                        }
                        className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-base text-navy-800 sm:text-sm outline-none hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-navy-700">
                        Target End Date
                      </label>
                      <input
                        type="date"
                        value={editForm.tgl_selesai}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, tgl_selesai: e.target.value }))
                        }
                        className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-base text-navy-800 sm:text-sm outline-none hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-cream px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-800">Update Cost Estimate Items (.xlsx)</p>
                      <p className="mt-0.5 text-[11px] text-navy-500">
                        Re-upload an Excel file to replace work items and weekly planned weights.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = projectToEdit.id;
                        setProjectToEdit(null);
                        selectProject(targetId);
                        router.push('/dashboard/manajemen/import-rab');
                      }}
                      className="btn-secondary shrink-0 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Excel
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-navy-100 bg-navy-50/70 px-5 py-3.5">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setProjectToEdit(null)}
                    className="btn-secondary px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    {savingEdit ? (
                      <>
                        <span className="spinner" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Project Confirmation Modal */}
      {portalReady &&
        projectToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/30 p-4 backdrop-blur-sm anim-fade"
            onClick={() => {
              if (!deletingProject) setProjectToDelete(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-project-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lift ring-1 ring-navy-900/5 anim-scale"
            >
              <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <Trash2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="delete-project-title" className="text-base font-semibold text-navy-800">
                      Delete project?
                    </h3>
                    <p className="text-xs text-navy-500">This action cannot be undone.</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deletingProject}
                  onClick={() => setProjectToDelete(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 hover:text-navy-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm leading-6 text-navy-600">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-navy-800">&ldquo;{projectToDelete.nama_proyek}&rdquo;</span>?
                  All associated Cost Estimate work items, weekly planned schedules, and progress reports will also be deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-navy-100 bg-navy-50/70 px-5 py-3.5">
                <button
                  type="button"
                  disabled={deletingProject}
                  onClick={() => setProjectToDelete(null)}
                  className="btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingProject}
                  onClick={handleConfirmDeleteProject}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
                >
                  {deletingProject ? (
                    <>
                      <span className="spinner" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Image Lightbox Portal */}
      {lightboxPhoto && (
        <ImageLightbox
          src={lightboxPhoto.src}
          alt={lightboxPhoto.alt}
          subtitle={lightboxPhoto.subtitle}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
}
