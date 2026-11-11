'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ActionToast from '@/components/ActionToast';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import DashboardHeader from '@/components/DashboardHeader';
import { motion } from 'framer-motion';
import { listVariants, itemVariants, TabPill } from '@/components/motion';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Check,
  Ban,
  FolderOpen,
  ChevronRight,
  FileText,
  MapPin,
  Calendar,
} from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';
import { useProject } from '@/components/ProjectContext';
import { useScrollLock } from '@/lib/useScrollLock';

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export default function PengawasDashboard() {
  const { selectedId, selected, projects, loading: projectsLoading, selectProject } = useProject();
  const [reports, setReports] = useState([]);
  const [rabItems, setRabItems] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportFilter, setReportFilter] = useState('pending');
  const [successToast, setSuccessToast] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const successToastTimeout = useRef(null);

  useScrollLock(!!selectedReport);

  useEffect(() => () => clearTimeout(successToastTimeout.current), []);

  const loadData = async (autoSelectFilter = false) => {
    setLoading(true);
    if (!selectedId) {
      try {
        const progresRes = await fetch('/api/progres');
        const progres = await progresRes.json();
        setReports(progres.success ? progres.data || [] : []);
      } catch {
        setReports([]);
      } finally {
        setRabItems([]);
        setLoading(false);
      }
      return;
    }
    try {
      const q = `proyek_id=${selectedId}`;
      const [progresRes, pekerjaanRes] = await Promise.all([
        fetch(`/api/progres?${q}`),
        fetch(`/api/pekerjaan?${q}`),
      ]);
      const progres = await progresRes.json();
      const pekerjaan = await pekerjaanRes.json();
      const list = progres.success ? progres.data || [] : [];
      setReports(list);
      if (autoSelectFilter) {
        const hasPending = list.some((r) => r.status_verifikasi === 'pending');
        setReportFilter(hasPending ? 'pending' : 'all');
      }
      if (pekerjaan.success) setRabItems(pekerjaan.data || []);
    } catch (e) {
      setReports([]);
      setRabItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    setSelectedReport(null);
    setMsg(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedReport) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) setSelectedReport(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedReport, saving]);

  const handleVerify = async (status) => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch('/api/progres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laporan_id: selectedReport.id,
          status_verifikasi: status,
          catatan_pengawas: catatan,
          pengawas_id: Number(localStorage.getItem('user_id')) || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg({ type: 'error', text: json.message || 'Could not update the report status.' });
        return;
      }
      setSelectedReport(null);
      setMsg(null);
      clearTimeout(successToastTimeout.current);
      setSuccessToast({
        title: status === 'approved' ? 'Report approved' : 'Report rejected',
        message: json.message || `The report was ${status}.`,
      });
      successToastTimeout.current = setTimeout(() => setSuccessToast(null), 4500);
      await loadData();
    } catch (e) {
      setMsg({ type: 'error', text: 'An error occurred while updating the review.' });
    } finally {
      setSaving(false);
    }
  };

  const pendingCount  = reports.filter((r) => r.status_verifikasi === 'pending').length;
  const approvedCount = reports.filter((r) => r.status_verifikasi === 'approved').length;
  const rejectedCount = reports.filter((r) => r.status_verifikasi === 'rejected').length;
  const visibleReports = reports.filter(
    (report) => reportFilter === 'all' || report.status_verifikasi === reportFilter
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        role="pengawas"
        compactTitle
        title={selected ? selected.nama_proyek : 'Supervisor Dashboard'}
        subtitle={
          selected
            ? `${selected.lokasi || 'Active project'} · ${reports.length} reports · ${rabItems.length} Cost Estimate items`
            : `${projects.length} projects`
        }
      />

      {!selectedId ? (
        <div className="space-y-4 sm:space-y-5">
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={<ClipboardList className="w-4 h-4" />} tone="orange" label="Total Reports" value={loading ? '—' : reports.length} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Awaiting Review" value={loading ? '—' : pendingCount} tone="amber" />
            <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={loading ? '—' : approvedCount} tone="emerald" />
            <StatCard icon={<XCircle className="w-4 h-4" />} label="Rejected" value={loading ? '—' : rejectedCount} tone="rose" />
          </motion.div>

          <section className="anim-content-enter overflow-hidden surface">
          <div className="flex flex-col gap-1 border-b border-line p-4 sm:p-5">
            <h3 className="text-section text-ink">Projects</h3>
          </div>
          <div className="p-3 sm:p-5">
            {projectsLoading ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-36 rounded-xl shimmer border border-line" />
                ))}
              </div>
            ) : projects.length ? (
              <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => (
                  <motion.article key={project.id} variants={itemVariants} className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-5 shadow-card">
                    <div className="flex items-start gap-3">
                      <span className="chip-orange flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold leading-5 text-ink">
                          {project.nama_proyek}
                        </h4>
                        <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-ink-secondary">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {project.lokasi || 'Location not set'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3">
                      <span className="text-xs text-ink-secondary">
                        {Number(project.rab_count || 0)} Cost Estimate items · Started {formatDate(project.tgl_mulai)}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectProject(project.id)}
                        className="btn-primary shrink-0 px-3"
                      >
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            ) : (
              <div className="px-4 py-12 text-center">
                <FolderOpen className="mx-auto h-8 w-8 text-orange-500" />
                <p className="mt-3 text-sm font-medium text-ink">No projects available</p>
              </div>
            )}
          </div>
        </section>
        </div>
      ) : (
      <>
      <button
        type="button"
        onClick={() => selectProject(null)}
        className="btn-secondary px-3.5"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        Back to Dashboard
      </button>

      {/* Stat Cards */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={<ClipboardList className="w-4 h-4" />} tone="orange" label="Total Reports" value={loading ? '-' : reports.length} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Awaiting Review" value={loading ? '-' : pendingCount} tone="amber" />
        <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={loading ? '-' : approvedCount} tone="emerald" />
        <StatCard icon={<XCircle className="w-4 h-4" />} label="Rejected" value={loading ? '-' : rejectedCount} tone="rose" />
      </motion.div>

      {/* Feedback message */}
      {msg && msg.type === 'error' && (
        <p
          role="status"
          className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {msg.text}
        </p>
      )}

      {/* Main grid: table left, info panel right */}
      <div
        key={`supervisor-project-${selectedId || 'none'}`}
        className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
      >
        {/* ── Left: Reports table ── */}
        <section className="overflow-hidden surface">
          <div className="flex min-w-0 flex-col gap-3 border-b border-line p-3.5 sm:p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-700">Review Queue</p>
              <h3 className="mt-0.5 text-section text-ink">Weekly Progress Reports</h3>
            </div>
            <div role="group" aria-label="Filter reports" className="seg grid w-full grid-cols-2 sm:grid-cols-4 2xl:inline-flex 2xl:w-fit">
              {[
                { value: 'pending',  label: 'Pending',   count: pendingCount },
                { value: 'approved', label: 'Approved', count: approvedCount },
                { value: 'rejected', label: 'Rejected', count: rejectedCount },
                { value: 'all',      label: 'All',      count: reports.length },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={reportFilter === f.value}
                  onClick={() => setReportFilter(f.value)}
                  className={`seg-item isolate gap-1 px-1.5 sm:gap-2 sm:px-3 ${reportFilter === f.value ? 'text-orange-700' : ''}`}
                >
                  {reportFilter === f.value && <TabPill layoutId="review-filter-pill" />}
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-semibold ${reportFilter === f.value ? 'bg-orange-50 text-orange-700' : 'bg-canvas text-ink-secondary'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <FolderOpen className="h-8 w-8 text-ink-muted" />
              <p className="text-sm text-ink-secondary">
                {!selectedId
                  ? 'Select a project from the sidebar first.'
                  : reports.length
                  ? 'No reports with this status.'
                  : 'No reports yet.'}
              </p>
            </div>
          ) : (
              <>
              <div key={`desktop-report-list-${reportFilter}`} className="hidden overflow-auto anim-content-enter lg:block">
              <table className="table-soft w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-canvas text-xs text-ink-secondary shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Work Item</th>
                    <th className="px-4 py-3 font-medium">Submitted By</th>
                    <th className="px-4 py-3 text-right font-medium">Progress</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleReports.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <p className="max-w-[220px] truncate font-medium text-ink">{r.nama_pekerjaan}</p>
                        <p className="mt-0.5 text-xs text-ink-secondary">{r.kode_pekerjaan} · Week {r.minggu_ke}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[130px] truncate text-ink">{r.mandor_nama || 'Foreman'}</p>
                        <p className="text-xs text-ink-secondary">{formatDate(r.tgl_laporan)}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {r.realisasi_bobot}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { setSelectedReport(r); setCatatan(r.catatan_pengawas || ''); }}
                          className={`px-3 ${ r.status_verifikasi === 'pending' ? 'btn-primary' : 'btn-secondary' }`}
                        >
                          {r.status_verifikasi === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div key={`mobile-report-list-${reportFilter}`} className="divide-y divide-line anim-content-enter lg:hidden">
              {visibleReports.map((report) => (
                <article key={report.id} className="space-y-3 p-4 transition-colors odd:bg-white even:bg-canvas active:bg-cream">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-semibold leading-5 text-ink">
                        {report.nama_pekerjaan}
                      </h4>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {report.kode_pekerjaan} · Week {report.minggu_ke}
                      </p>
                    </div>
                    <StatusBadge status={report.status_verifikasi} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                    <span className="min-w-0 truncate">By {report.mandor_nama || 'Foreman'}</span>
                    <span className="shrink-0">{formatDate(report.tgl_laporan)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="text-xs text-ink-secondary">Actual progress</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {report.realisasi_bobot}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReport(report);
                      setCatatan(report.catatan_pengawas || '');
                    }}
                    className={`w-full ${ report.status_verifikasi === 'pending' ? 'btn-primary' : 'btn-secondary' }`}
                  >
                    {report.status_verifikasi === 'pending' ? 'Review report' : 'View report'}
                  </button>
                </article>
              ))}
            </div>
            </>
          )}
        </section>

        {/* ── Right: Project Info + RAB Summary ── */}
        <aside className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {/* Project Info */}
          <div className="overflow-hidden surface">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-section text-ink">Project Info</h3>
            </div>
            {selected ? (
              <dl className="divide-y divide-line text-sm">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="chip-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><FolderOpen className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-secondary">Project Name</dt>
                    <dd className="mt-0.5 break-words font-medium text-ink">{selected.nama_proyek}</dd>
                  </div>
                </div>
                {selected.lokasi && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="chip-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><MapPin className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-secondary">Location</dt>
                      <dd className="mt-0.5 break-words text-ink">{selected.lokasi}</dd>
                    </div>
                  </div>
                )}
                {selected.tgl_mulai && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="chip-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Calendar className="h-4 w-4" /></span>
                    <div>
                      <dt className="text-xs text-ink-secondary">Start Date</dt>
                      <dd className="mt-0.5 text-ink">{formatDate(selected.tgl_mulai)}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="chip-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><FileText className="h-4 w-4" /></span>
                  <div>
                    <dt className="text-xs text-ink-secondary">Cost Estimate Items</dt>
                    <dd className="mt-0.5 font-medium text-ink">{loading ? '—' : rabItems.length} item</dd>
                  </div>
                </div>
              </dl>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FolderOpen className="h-7 w-7 text-ink-muted" />
                <p className="text-xs text-ink-secondary">No project selected</p>
              </div>
            )}
          </div>

          {/* Cost Estimate items mini-list */}
          {rabItems.length > 0 && (
            <div className="overflow-hidden surface">
              <div className="border-b border-line px-4 py-3">
                <h3 className="text-section text-ink">Cost Estimate Work Items</h3>
              </div>
              <ul className="max-h-[300px] divide-y divide-line overflow-auto overscroll-contain text-sm">
                {rabItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-4 py-2.5 transition-colors even:bg-canvas hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{item.nama_pekerjaan}</p>
                      <p className="text-[10px] text-ink-secondary">{item.kode_pekerjaan}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-orange-700">
                      {item.bobot_persen}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      </>
      )}

      {/* ── Review Modal ── */}
      {selectedReport && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center min-h-screen p-3 sm:p-4 bg-navy-950/40 modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setSelectedReport(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
            className="modal-panel flex flex-col max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-hidden rounded-dialog border border-line bg-surface shadow-dialog"
          >
            <div className="shrink-0 flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h3 id="review-dialog-title" className="text-lg font-semibold text-ink">
                  {selectedReport.status_verifikasi === 'pending' ? 'Review Report' : 'Report Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={saving}
                aria-label="Close review dialog"
                className="btn-icon p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs text-ink-secondary">Work Item</p>
                <p className="mt-1 text-sm font-medium text-ink">
                  [{selectedReport.kode_pekerjaan}] {selectedReport.nama_pekerjaan}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-line py-4 text-sm sm:gap-x-5">
                <div>
                  <dt className="text-xs text-ink-secondary">Submitted By</dt>
                  <dd className="mt-1 font-medium text-ink">{selectedReport.mandor_nama || 'Foreman'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Report Date</dt>
                  <dd className="mt-1 font-medium text-ink">{formatDate(selectedReport.tgl_laporan)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Week</dt>
                  <dd className="mt-1 font-medium text-ink">{selectedReport.minggu_ke}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Actual Progress</dt>
                  <dd className="mt-1 font-medium text-ink">
                    {selectedReport.realisasi_bobot}%
                    <span className="ml-1 text-ink-secondary">/ {selectedReport.bobot_persen}% weight</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Status</dt>
                  <dd className="mt-1"><StatusBadge status={selectedReport.status_verifikasi} /></dd>
                </div>
              </dl>

              {selectedReport.foto_bukti ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto({
                      src: selectedReport.foto_bukti,
                      alt: `Week ${selectedReport.minggu_ke} · ${selectedReport.nama_pekerjaan}`,
                      subtitle: `Submitted by ${selectedReport.mandor_nama || 'Foreman'} on ${formatDate(selectedReport.tgl_laporan)}`
                    })}
                    className="group relative block w-full overflow-hidden rounded-xl border border-line bg-canvas transition hover:border-orange-500 hover:shadow-card focus:outline-none"
                  >
                    <img
                      src={selectedReport.foto_bukti}
                      alt={`Progress evidence for week ${selectedReport.minggu_ke}`}
                      className="max-h-[35vh] w-full rounded-xl object-contain sm:max-h-72 transition duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-950/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition duration-200">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-card">
                        Click to zoom
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">No progress photo attached.</p>
              )}

              {selectedReport.status_verifikasi === 'pending' ? (
                <label className="block">
                  <span className="field-label">
                    Review Notes <span className="font-normal text-ink-secondary">(optional)</span>
                  </span>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Add a note for the foreman..."
                    className="field h-auto resize-y py-2.5"
                  />
                </label>
              ) : (
                <div className="rounded-xl border border-line bg-canvas p-3.5">
                  <p className="text-xs font-medium text-ink-secondary">Supervisor Review Notes</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
                    {selectedReport.catatan_pengawas || 'No review notes recorded.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-4 py-3 sm:flex-row sm:justify-between sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={saving}
                className="btn-secondary px-4"
              >
                {selectedReport.status_verifikasi === 'pending' ? 'Cancel' : 'Close'}
              </button>
              {selectedReport.status_verifikasi === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerify('rejected')}
                    disabled={saving}
                    className="btn-danger-outline flex-1 px-4 sm:flex-none"
                  >
                    <Ban className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify('approved')}
                    disabled={saving}
                    className="btn-primary flex-1 px-4 sm:flex-none"
                  >
                    {saving ? <span className="spinner" /> : <Check className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
      {successToast && createPortal(
        <ActionToast
          title={successToast.title}
          message={successToast.message}
          onDismiss={() => {
            clearTimeout(successToastTimeout.current);
            setSuccessToast(null);
          }}
        />,
        document.body
      )}
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
