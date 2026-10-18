'use client';

import React, { useState, useEffect } from 'react';
import SCurveChart from '@/components/SCurveChart';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
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
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ManajemenDashboard() {
  const { selectedId, selected, projects, loading: projectsLoading, selectProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [sCurveData, setSCurveData] = useState({ labels: [], rencana: [], realisasi: [] });
  const [proyek, setProyek] = useState(null);
  const [rabItems, setRabItems] = useState([]);
  const [laporan, setLaporan] = useState([]);
  const [activeView, setActiveView] = useState('projects'); // 'projects' | 'detail'
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedCurveWeek, setSelectedCurveWeek] = useState(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null);

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
  let delayStatus = 'on_track'; // 'on_track' | 'ahead' | 'delayed'
  let delayBadgeLabel = 'On Schedule';
  let delaySummaryText = '';

  if (lastRealisasi != null && currentWeekNumber != null) {
    if (currentWeekNumber > originalPlannedWeeks) {
      timeDelayWeeks = currentWeekNumber - originalPlannedWeeks;
      timeDelayDays = timeDelayWeeks * 7;
      delayStatus = 'delayed';
      delayBadgeLabel = `Delayed +${timeDelayWeeks} Weeks`;
      delaySummaryText = `The project is 100% completed, but exceeded the initial contract schedule (${originalPlannedWeeks} weeks) by ${timeDelayWeeks} weeks (${timeDelayDays} days).`;
    } else {
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

      const weekDiff = currentWeekNumber - eqWeek;
      if (weekDiff > 0) {
        timeDelayWeeks = weekDiff;
        timeDelayDays = weekDiff * 7;
        delayStatus = 'delayed';
        delayBadgeLabel = `Behind by ~${timeDelayWeeks} Weeks`;
        delaySummaryText = `Current actual progress is ${lastRealisasi}%, lagging behind the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber}. Progress is equivalent to Week ${eqWeek} targets, resulting in an estimated project delay of ${timeDelayWeeks} weeks (${timeDelayDays} days).`;
      } else if (weekDiff < 0) {
        timeDelayWeeks = Math.abs(weekDiff);
        timeDelayDays = Math.abs(weekDiff) * 7;
        delayStatus = 'ahead';
        delayBadgeLabel = `Ahead by ~${timeDelayWeeks} Weeks`;
        delaySummaryText = `Current actual progress is ${lastRealisasi}%, exceeding the planned target of ${plannedAtCutoff}% at Week ${currentWeekNumber}. The project is ahead of schedule by approximately ${timeDelayWeeks} weeks (${timeDelayDays} days).`;
      } else {
        if (deviasi < -1) {
          timeDelayDays = Math.max(1, Math.round((Math.abs(deviasi) / (plannedAtCutoff || 1)) * 7));
          timeDelayWeeks = Math.floor(timeDelayDays / 7);
          delayStatus = 'delayed';
          delayBadgeLabel = timeDelayWeeks > 0 ? `Behind by ~${timeDelayWeeks} Weeks` : `Behind by ~${timeDelayDays} Days`;
          delaySummaryText = `Actual progress is ${lastRealisasi}%, slightly below the planned target of ${plannedAtCutoff}%, with an estimated delay of ${timeDelayDays} days.`;
        } else if (deviasi > 1) {
          timeDelayDays = Math.max(1, Math.round((deviasi / (plannedAtCutoff || 1)) * 7));
          timeDelayWeeks = Math.floor(timeDelayDays / 7);
          delayStatus = 'ahead';
          delayBadgeLabel = timeDelayWeeks > 0 ? `Ahead by ~${timeDelayWeeks} Weeks` : `Ahead by ~${timeDelayDays} Days`;
          delaySummaryText = `Actual progress is ${lastRealisasi}%, exceeding the planned target of ${plannedAtCutoff}%, with an estimated lead time of ${timeDelayDays} days.`;
        } else {
          timeDelayWeeks = 0;
          timeDelayDays = 0;
          delayStatus = 'on_track';
          delayBadgeLabel = 'On Schedule';
          delaySummaryText = `Physical progress is ${lastRealisasi}%, running precisely on schedule with 0 days of delay.`;
        }
      }
    }
  }

  const clampPct = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const plannedDisplayValue = plannedAtCutoff != null ? plannedAtCutoff : totalRencana;
  const delayDurationLabel =
    timeDelayWeeks > 0
      ? `${timeDelayWeeks} week${timeDelayWeeks === 1 ? '' : 's'}`
      : `${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`;
  const delayBigValue = delayStatus === 'on_track' ? 'On schedule' : delayDurationLabel;
  const delayBigCaption =
    delayStatus === 'delayed'
      ? `Behind by ≈ ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`
      : delayStatus === 'ahead'
      ? `Ahead by ≈ ${timeDelayDays} day${timeDelayDays === 1 ? '' : 's'}`
      : 'No delay reported';
  const scheduleTone =
    delayStatus === 'delayed'
      ? { chip: 'bg-rose-50 text-rose-700', value: 'text-rose-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> }
      : delayStatus === 'ahead'
      ? { chip: 'bg-teal-50 text-teal-700', value: 'text-teal-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
      : { chip: 'bg-emerald-50 text-emerald-700', value: 'text-emerald-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };

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
            ? `${activeProject.lokasi || 'Active project'} · ${rabItems.length} RAB items · ${laporan.length} reports`
            : `${projects.length} projects · ${totalRabItems} RAB items`
        }
      />

      {/* ── Tab Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Management dashboard views" className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1 sm:inline-flex sm:w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'projects'}
            onClick={() => {
              setSelectedWorkItemId(null);
              selectProject(null);
              setActiveView('projects');
            }}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
              activeView === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            All Projects
            <span className="text-xs text-slate-400">{projects.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'detail'}
            onClick={() => { if (selectedId) setActiveView('detail'); }}
            disabled={!selectedId}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
              activeView === 'detail'
                ? 'bg-white text-slate-900 shadow-sm'
                : selectedId
                ? 'text-slate-500 hover:text-slate-800'
                : 'cursor-not-allowed text-slate-300'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Project Detail
            {selectedId && activeProject && (
              <span className="max-w-[100px] truncate text-[11px] text-teal-700 font-medium">
                {activeProject.nama_proyek}
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={<FolderKanban className="h-4 w-4" />}
              label="Projects"
              value={projectsLoading ? '—' : projects.length}
            />
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label="Total RAB Items"
              value={projectsLoading ? '—' : totalRabItems}
            />
            <div className="col-span-2 flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 p-4 sm:col-span-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">Current Project</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                  {selected?.nama_proyek || 'None selected'}
                </p>
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">All Projects</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose a project to view its progress, S-Curve, and work items.
              </p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:max-w-xs focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-50 transition">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={projectQuery}
                onChange={(e) => setProjectQuery(e.target.value)}
                placeholder="Search projects or location..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="p-3 sm:p-5">
            {projectsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-40 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : visibleProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProjects.map((project) => {
                  const active = Number(selectedId) === Number(project.id);
                  return (
                    <article
                      key={project.id}
                      className={`flex min-w-0 flex-col rounded-xl border p-4 transition ${
                        active ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <FolderKanban className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="break-words text-sm font-semibold leading-5 text-slate-900">
                            {project.nama_proyek}
                          </h4>
                          <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-slate-500">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {project.lokasi || 'Location not set'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">RAB Items</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">{Number(project.rab_count || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Start Date</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-700">{formatDate(project.tgl_mulai)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        {active ? (
                          <span className="text-[11px] font-medium text-slate-500">Selected project</span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            selectProject(project.id);
                            setActiveView('detail');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                        >
                          Open project
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FolderKanban className="h-6 w-6" />
                </span>
                <h4 className="mt-4 text-sm font-semibold text-slate-900">
                  {projects.length ? 'No projects match your search.' : 'No projects yet'}
                </h4>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  {projects.length
                    ? 'Try another project name or location.'
                    : 'Create a project with the plus button in the sidebar and upload its RAB at the same time.'}
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
        <div className="anim-content-enter rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">No project selected</h3>
          <p className="mt-1 text-xs text-slate-500">
            Pick a project from the list or sidebar to view its S-Curve and work items.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('projects')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            View All Projects
          </button>
        </div>
      )}

      {activeView === 'detail' && selectedId && (
        <div key={`project-detail-${selectedId}`} className="anim-content-enter space-y-5">
          {/* Back button */}
          <button
            type="button"
            onClick={() => {
              if (selectedWorkItem) setSelectedWorkItemId(null);
              else {
                selectProject(null);
                setActiveView('projects');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {selectedWorkItem ? 'Back to Work Items' : 'Back to Projects'}
          </button>

          {/* ── Stat Cards ── */}
          {!selectedWorkItem && (
            <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-grid">
              <StatCard
                icon={<Wallet className="w-4 h-4" />}
                label="Total RAB Weight"
                value={loading ? '—' : `${totalBobot.toFixed(1)}%`}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label={currentWeekNumber ? `Planned (W${currentWeekNumber})` : 'Planned Target'}
                value={loading ? '—' : (plannedAtCutoff != null ? `${plannedAtCutoff}%` : (totalRencana != null ? `${totalRencana}%` : '—'))}
              />
              <StatCard
                icon={<Activity className="w-4 h-4" />}
                label={currentWeekNumber ? `Actual (W${currentWeekNumber})` : 'Actual (latest)'}
                value={loading ? '—' : lastRealisasi != null ? `${lastRealisasi}%` : '—'}
              />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="Schedule Variance"
                value={
                  loading
                    ? '—'
                    : lastRealisasi == null
                    ? '—'
                    : delayStatus === 'delayed'
                    ? timeDelayWeeks > 0 ? `-${timeDelayWeeks} Wks` : `-${timeDelayDays} Days`
                    : delayStatus === 'ahead'
                    ? timeDelayWeeks > 0 ? `+${timeDelayWeeks} Wks` : `+${timeDelayDays} Days`
                    : 'On Schedule'
                }
                hint={
                  deviasi != null
                    ? `${deviasi > 0 ? '+' : ''}${deviasi}%`
                    : undefined
                }
                tone={delayStatus === 'delayed' ? 'rose' : delayStatus === 'ahead' ? 'teal' : 'emerald'}
              />
            </div>

            {/* ── Schedule Status: Actual vs Planned & Delay ── */}
            <section className="anim-content-enter overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Schedule Status</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Actual vs Planned &amp; Delay</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {currentWeekNumber ? `As of Week ${currentWeekNumber}. ` : ''}
                    A quick read of how far the actual work is from the plan.
                  </p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${scheduleTone.chip}`}>
                  {scheduleTone.icon}
                  {delayBadgeLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {/* Actual */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">Actual progress</p>
                    <Activity className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {loading ? '—' : lastRealisasi != null ? `${lastRealisasi}%` : '—'}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${clampPct(lastRealisasi)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Work completed so far</p>
                </div>

                {/* Planned */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">
                      {currentWeekNumber ? `Planned target (W${currentWeekNumber})` : 'Planned target'}
                    </p>
                    <TrendingUp className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {loading ? '—' : plannedDisplayValue != null ? `${plannedDisplayValue}%` : '—'}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${clampPct(plannedDisplayValue)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">What should be done by now</p>
                </div>

                {/* Delay */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">Delay</p>
                    <Clock className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className={`mt-2 text-2xl font-semibold tracking-tight ${scheduleTone.value}`}>
                    {loading || lastRealisasi == null ? '—' : delayBigValue}
                  </p>
                  <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${scheduleTone.value}`}>
                    {scheduleTone.icon}
                    {loading || lastRealisasi == null ? 'Awaiting progress data' : delayBigCaption}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {deviasi != null
                      ? `${deviasi > 0 ? '+' : ''}${deviasi}% vs plan`
                      : 'Difference from plan'}
                  </p>
                </div>
              </div>

              {lastRealisasi != null && delaySummaryText && (
                <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs leading-5 text-slate-600 sm:px-5">
                  {delaySummaryText}
                </p>
              )}
            </section>
            </>
          )}

          {/* Item review records */}
          {selectedWorkItem && <section className="anim-content-enter overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Work Item · {selectedWorkItem.kode_pekerjaan}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{selectedWorkItem.nama_pekerjaan}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedWorkItem.volume ? `${selectedWorkItem.volume} ${selectedWorkItem.satuan || ''} · ` : ''}
                RAB weight {Number(selectedWorkItem.bobot_persen).toFixed(2)}% ·{' '}
                {selectedWorkItemApprovedProgress}% approved · {selectedWorkItemReports.length} reports
              </p>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Loading reports...</p>
            ) : selectedWorkItemReports.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No progress reports have been submitted for this work item yet.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Week / Date</th>
                        <th className="px-4 py-3 font-medium">Foreman</th>
                        <th className="px-4 py-3 text-right font-medium">Actual</th>
                        <th className="px-4 py-3 font-medium">Review</th>
                        <th className="px-4 py-3 font-medium">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWorkItemReports.map((report) => (
                        <tr key={report.id} className="align-top transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">Week {report.minggu_ke}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(report.tgl_laporan)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <p>{report.mandor_nama || 'Foreman'}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                            {Number(report.realisasi_bobot)}%
                          </td>
                          <td className="max-w-[260px] px-4 py-3">
                            <StatusBadge status={report.status_verifikasi} />
                            {report.pengawas_nama && (
                              <p className="mt-1 text-xs text-slate-500">Reviewed by {report.pengawas_nama}</p>
                            )}
                            {report.catatan_pengawas ? (
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                                {report.catatan_pengawas}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-slate-400">No review note</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {report.foto_bukti ? (
                              <a href={report.foto_bukti} target="_blank" rel="noreferrer" className="inline-block">
                                <img
                                  src={report.foto_bukti}
                                  alt={`Evidence for ${report.nama_pekerjaan}, week ${report.minggu_ke}`}
                                  className="h-16 w-24 rounded-lg border border-slate-200 object-cover transition hover:opacity-80"
                                />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">No photo attached</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">
                  {selectedWorkItemReports.map((report) => (
                    <article key={report.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold leading-5 text-slate-900">
                            Week {report.minggu_ke}
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(report.tgl_laporan)}</p>
                        </div>
                        <StatusBadge status={report.status_verifikasi} />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="truncate">{report.mandor_nama || 'Foreman'}</span>
                        <span className="shrink-0 font-semibold text-slate-800">
                          {Number(report.realisasi_bobot)}% actual
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{formatDate(report.tgl_laporan)}</p>
                      {report.pengawas_nama && (
                        <p className="text-xs text-slate-500">Reviewed by {report.pengawas_nama}</p>
                      )}
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supervisor note</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                          {report.catatan_pengawas || 'No review note'}
                        </p>
                      </div>
                      {report.foto_bukti ? (
                        <a href={report.foto_bukti} target="_blank" rel="noreferrer" className="inline-block">
                          <img
                            src={report.foto_bukti}
                            alt={`Evidence for ${report.nama_pekerjaan}, week ${report.minggu_ke}`}
                            className="h-28 w-40 rounded-lg border border-slate-200 object-cover"
                          />
                          <span className="mt-1 block text-xs text-slate-500">Open full-size photo</span>
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">No photo evidence attached.</p>
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
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Progress Visualization</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">S-Curve (Planned vs Actual)</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Weekly cumulative comparison. Actual progress includes approved reports from this and earlier weeks.
                  </p>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="flex h-72 items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
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
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Selected week
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          Week {selectedCurveWeek} reported work
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500">
                        Planned cumulative: {sCurveData.rencana[selectedCurveWeek - 1] ?? 0}% ·
                        {' '}Actual cumulative: {sCurveData.realisasi[selectedCurveWeek - 1] ?? '—'}%
                      </p>
                    </div>
                    {laporan.filter((report) => Number(report.minggu_ke) === selectedCurveWeek).length ? (
                      <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {laporan
                          .filter((report) => Number(report.minggu_ke) === selectedCurveWeek)
                          .map((report) => (
                            <article
                              key={report.id}
                              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                            >
                              <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-slate-900">
                                  <span className="mr-1 font-mono text-xs text-slate-400">
                                    {report.kode_pekerjaan}
                                  </span>
                                  {report.nama_pekerjaan}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {Number(report.realisasi_bobot)}% reported · {report.mandor_nama || 'Foreman'} ·{' '}
                                  {formatDate(report.tgl_laporan)}
                                </p>
                                {report.catatan_pengawas && (
                                  <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">
                                    Supervisor note: {report.catatan_pengawas}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                <StatusBadge status={report.status_verifikasi} />
                                {report.foto_bukti && (
                                  <a
                                    href={report.foto_bukti}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  >
                                    View evidence
                                  </a>
                                )}
                              </div>
                            </article>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                        No reports were submitted for this week.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* RAB items table */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">RAB</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">Work Items</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Select an item to view its review records and evidence.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {loading ? '—' : rabItems.length} items
                  </span>
                </div>
                {loading ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-400">Loading...</p>
                ) : rabItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-14">
                    <FileText className="h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">No work items yet for this project.</p>
                  </div>
                ) : (
                  <>
                  <div className="hidden max-h-[380px] overflow-auto md:block">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Code</th>
                          <th className="px-5 py-3 font-medium">Work Item</th>
                          <th className="px-5 py-3 text-right font-medium">Volume</th>
                          <th className="px-5 py-3 text-right font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
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
                            className="cursor-pointer hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none transition"
                            aria-label={`View reports for ${item.kode_pekerjaan} ${item.nama_pekerjaan}`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{item.kode_pekerjaan}</td>
                            <td className="px-5 py-3 font-medium text-slate-900">
                              <span className="flex items-center justify-between gap-3">
                                <span>{item.nama_pekerjaan}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-xs tabular-nums text-slate-500">
                              {item.volume ? `${item.volume} ${item.satuan || ''}` : '—'}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">
                              <span className="font-semibold text-teal-700">{item.bobot_persen}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-slate-100 md:hidden">
                    {rabItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedWorkItemId(item.id)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                        aria-label={`View reports for ${item.kode_pekerjaan} ${item.nama_pekerjaan}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-[11px] text-slate-400">{item.kode_pekerjaan}</span>
                          <span className="mt-1 block break-words text-sm font-medium leading-5 text-slate-900">
                            {item.nama_pekerjaan}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {item.volume ? `${item.volume} ${item.satuan || ''} · ` : ''}
                            Weight {Number(item.bobot_persen).toFixed(2)}%
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
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
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Project Info</p>
                </div>
                <dl className="divide-y divide-slate-100">
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
                    label="Total RAB Items"
                    value={loading ? '—' : `${rabItems.length} items`}
                  />
                </dl>
              </div>

              {/* Report summary */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                  <h3 className="text-sm font-semibold text-slate-900">Report summary</h3>
                </div>
                <div className="divide-y divide-slate-100 px-4 sm:px-5">
                  {[
                    { label: 'Pending review', value: pendingCount, tone: 'text-amber-700' },
                    { label: 'Approved', value: approvedCount, tone: 'text-slate-700' },
                    { label: 'Rejected', value: rejectedCount, tone: 'text-rose-700' },
                    { label: 'Total reports', value: laporan.length, tone: 'text-slate-900' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-slate-600">{row.label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${row.tone}`}>
                        {loading ? '—' : row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deviasi indicator */}
              {deviasi != null && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Schedule variance</p>
                      <p className={`mt-1 text-sm font-semibold ${deviasi >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>
                        {deviasi >= 0 ? 'Ahead of schedule' : 'Behind schedule'}
                      </p>
                    </div>
                    <p className={`shrink-0 text-xl font-semibold tabular-nums tracking-tight ${
                      deviasi >= 0 ? 'text-slate-800' : 'text-rose-700'
                    }`}>
                      {deviasi > 0 ? '+' : ''}{deviasi}%
                    </p>
                  </div>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
                    Difference between actual progress ({lastRealisasi}%) and planned progress ({plannedAtCutoff}%){currentWeekNumber ? ` at Week ${currentWeekNumber}` : ''}.
                  </p>
                </div>
              )}
            </aside>
          </div>}
        </div>
      )}
    </div>
  );
}
