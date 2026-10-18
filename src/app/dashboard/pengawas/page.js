'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ActionToast from '@/components/ActionToast';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import DashboardHeader from '@/components/DashboardHeader';
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
  const successToastTimeout = useRef(null);

  useScrollLock(!!selectedReport);

  useEffect(() => () => clearTimeout(successToastTimeout.current), []);

  const loadData = async () => {
    if (!selectedId) {
      setReports([]);
      setRabItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = `proyek_id=${selectedId}`;
      const [progresRes, pekerjaanRes] = await Promise.all([
        fetch(`/api/progres?${q}`),
        fetch(`/api/pekerjaan?${q}`),
      ]);
      const progres = await progresRes.json();
      const pekerjaan = await pekerjaanRes.json();
      if (progres.success) setReports(progres.data || []);
      if (pekerjaan.success) setRabItems(pekerjaan.data || []);
    } catch (e) {
      setReports([]);
      setRabItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
            ? `${selected.lokasi || 'Active project'} · ${reports.length} reports · ${rabItems.length} RAB items`
            : `${projects.length} projects · Select a project to review its reports.`
        }
      />

      {!selectedId ? (
        <section className="anim-content-enter overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-100 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
            <p className="text-xs text-slate-500">Choose a project to open its report review workspace.</p>
          </div>
          <div className="p-3 sm:p-5">
            {projectsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : projects.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <article key={project.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold leading-5 text-slate-900">
                          {project.nama_proyek}
                        </h4>
                        <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-slate-500">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {project.lokasi || 'Location not set'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      <span className="text-xs text-slate-500">
                        {Number(project.rab_count || 0)} RAB items · Started {formatDate(project.tgl_mulai)}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectProject(project.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                      >
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No projects available</p>
                <p className="mt-1 text-xs text-slate-500">Ask Management to create a project and upload its RAB.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
      <>
      <button
        type="button"
        onClick={() => selectProject(null)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        Back to Dashboard
      </button>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 stagger-grid">
        <StatCard icon={<ClipboardList className="w-4 h-4" />} label="Total Reports" value={loading ? '-' : reports.length} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Awaiting Review" value={loading ? '-' : pendingCount} tone="amber" />
        <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={loading ? '-' : approvedCount} tone="emerald" />
        <StatCard icon={<XCircle className="w-4 h-4" />} label="Rejected" value={loading ? '-' : rejectedCount} />
      </div>

      {/* Feedback message */}
      {msg && msg.type === 'error' && (
        <p
          role="status"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
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
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex min-w-0 flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Review Queue</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">Weekly Progress Reports</h3>
              <p className="mt-0.5 text-xs text-slate-500">Approve valid reports or reject them for correction.</p>
            </div>
            <div role="group" aria-label="Filter reports" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-fit sm:flex-wrap sm:overflow-visible">
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
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    reportFilter === f.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] opacity-60">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <FolderOpen className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">
                {!selectedId
                  ? 'Select a project from the sidebar first.'
                  : reports.length
                  ? 'No reports with this status.'
                  : 'No reports have been submitted for this project yet.'}
              </p>
            </div>
          ) : (
              <>
              <div key={`desktop-report-list-${reportFilter}`} className="hidden overflow-auto anim-content-enter md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Work Item</th>
                    <th className="px-4 py-3 font-medium">Submitted By</th>
                    <th className="px-4 py-3 text-right font-medium">Progress</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleReports.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="max-w-[220px] truncate font-medium text-slate-900">{r.nama_pekerjaan}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{r.kode_pekerjaan} · Week {r.minggu_ke}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[130px] truncate text-slate-700">{r.mandor_nama || 'Foreman'}</p>
                        <p className="text-xs text-slate-400">{formatDate(r.tgl_laporan)}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {r.realisasi_bobot}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { setSelectedReport(r); setCatatan(r.catatan_pengawas || ''); }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            r.status_verifikasi === 'pending'
                              ? 'bg-teal-700 text-white hover:bg-teal-800'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {r.status_verifikasi === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div key={`mobile-report-list-${reportFilter}`} className="divide-y divide-slate-100 anim-content-enter md:hidden">
              {visibleReports.map((report) => (
                <article key={report.id} className="space-y-3 p-4 transition-colors active:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-semibold leading-5 text-slate-900">
                        {report.nama_pekerjaan}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.kode_pekerjaan} · Week {report.minggu_ke}
                      </p>
                    </div>
                    <StatusBadge status={report.status_verifikasi} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="min-w-0 truncate">By {report.mandor_nama || 'Foreman'}</span>
                    <span className="shrink-0">{formatDate(report.tgl_laporan)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Actual progress</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {report.realisasi_bobot}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReport(report);
                      setCatatan(report.catatan_pengawas || '');
                    }}
                    className={`min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      report.status_verifikasi === 'pending'
                        ? 'bg-slate-900 text-white hover:bg-slate-700'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Project Info</p>
            </div>
            {selected ? (
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-start gap-3 px-4 py-3">
                  <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Project Name</dt>
                    <dd className="mt-0.5 break-words font-medium text-slate-900">{selected.nama_proyek}</dd>
                  </div>
                </div>
                {selected.lokasi && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">Location</dt>
                      <dd className="mt-0.5 break-words text-slate-700">{selected.lokasi}</dd>
                    </div>
                  </div>
                )}
                {selected.tgl_mulai && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-500">Start Date</dt>
                      <dd className="mt-0.5 text-slate-700">{formatDate(selected.tgl_mulai)}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">RAB Items</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{loading ? '—' : rabItems.length} item</dd>
                  </div>
                </div>
              </dl>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FolderOpen className="h-7 w-7 text-slate-200" />
                <p className="text-xs text-slate-400">No project selected</p>
              </div>
            )}
          </div>

          {/* RAB items mini-list */}
          {rabItems.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">RAB Work Items</p>
              </div>
              <ul className="max-h-[300px] divide-y divide-slate-100 overflow-auto overscroll-contain text-sm">
                {rabItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">{item.nama_pekerjaan}</p>
                      <p className="text-[10px] text-slate-400">{item.kode_pekerjaan}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-teal-700">
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setSelectedReport(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
            className="modal-panel flex flex-col max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="shrink-0 flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Progress Report</p>
                <h3 id="review-dialog-title" className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedReport.status_verifikasi === 'pending' ? 'Review Report' : 'Report Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={saving}
                aria-label="Close review dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs text-slate-500">Work Item</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  [{selectedReport.kode_pekerjaan}] {selectedReport.nama_pekerjaan}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-slate-100 py-4 text-sm sm:gap-x-5">
                <div>
                  <dt className="text-xs text-slate-500">Submitted By</dt>
                  <dd className="mt-1 font-medium text-slate-800">{selectedReport.mandor_nama || 'Foreman'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Report Date</dt>
                  <dd className="mt-1 font-medium text-slate-800">{formatDate(selectedReport.tgl_laporan)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Week</dt>
                  <dd className="mt-1 font-medium text-slate-800">{selectedReport.minggu_ke}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Actual Progress</dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedReport.realisasi_bobot}%
                    <span className="ml-1 text-slate-400">/ {selectedReport.bobot_persen}% weight</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-1"><StatusBadge status={selectedReport.status_verifikasi} /></dd>
                </div>
              </dl>

              {selectedReport.foto_bukti ? (
                <a href={selectedReport.foto_bukti} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={selectedReport.foto_bukti}
                    alt={`Progress evidence for week ${selectedReport.minggu_ke}`}
                    className="max-h-[35vh] w-full rounded-lg border border-slate-200 object-contain sm:max-h-72"
                  />
                  <span className="mt-1 block text-xs text-teal-700">Open full-size photo</span>
                </a>
              ) : (
                <p className="text-xs text-slate-400">No progress photo attached.</p>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Review Notes <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Add a note for the foreman..."
                  className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm focus:border-teal-600 focus:ring-4 focus:ring-teal-50 outline-none"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:justify-between sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={saving}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              {selectedReport.status_verifikasi === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerify('rejected')}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 sm:flex-none"
                  >
                    <Ban className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify('approved')}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 sm:flex-none"
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
    </div>
  );
}
