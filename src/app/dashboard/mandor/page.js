'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  FolderKanban,
  Search,
  ArrowLeft,
  Layers,
  MapPin,
  FileText,
  Send,
  X,
} from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { motion } from 'framer-motion';
import { listVariants, TabPill } from '@/components/motion';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import ActionToast from '@/components/ActionToast';
import ImageLightbox from '@/components/ImageLightbox';
import { useProject } from '@/components/ProjectContext';
import { useScrollLock } from '@/lib/useScrollLock';

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export default function MandorDashboard() {
  const router = useRouter();
  const { selectedId, selected, projects, selectProject } = useProject();

  const [history, setHistory] = useState([]);
  const [rabItems, setRabItems] = useState([]);
  const [proyekDetail, setProyekDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const rabListRef = useRef(null);
  const rabLayoutBeforeFilterRef = useRef(null);

  // Filter & tab state
  const [activeTab, setActiveTab] = useState('rab'); // 'rab' | 'laporan'
  const [homeTab, setHomeTab] = useState('projects'); // 'projects' | 'reports'
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyItemFilter, setHistoryItemFilter] = useState('all');
  const [rabReportFilter, setRabReportFilter] = useState('all');
  const [rabSearch, setRabSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [mandorId, setMandorId] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useScrollLock(!!reportToDelete);
  const actionMsgTimeout = useRef(null);
  const reportSuccessTimeout = useRef(null);
  const reportStatusesRef = useRef({ projectId: null, statuses: null });

  const showReportSuccess = (title, message) => {
    clearTimeout(reportSuccessTimeout.current);
    setReportSuccess({ title, message });
    reportSuccessTimeout.current = setTimeout(() => setReportSuccess(null), 4500);
  };

  useEffect(() => () => {
    clearTimeout(actionMsgTimeout.current);
    clearTimeout(reportSuccessTimeout.current);
  }, []);
  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!portalReady) return;
    const successMessage = sessionStorage.getItem('mandor_report_success');
    if (!successMessage) return;

    sessionStorage.removeItem('mandor_report_success');
    showReportSuccess('Report sent successfully', successMessage);
  }, [portalReady]);

  useEffect(() => {
    if (!reportToDelete) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !deletingReportId) setReportToDelete(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [reportToDelete, deletingReportId]);

  const showActionMessage = (message) => {
    clearTimeout(actionMsgTimeout.current);
    setActionMsg(message);
    actionMsgTimeout.current = setTimeout(() => setActionMsg(null), 4000);
  };

  // Fetch data
  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      const mandorId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || '' : '';
      if (mandorId) setMandorId(mandorId);
      clearTimeout(actionMsgTimeout.current);
      setActionMsg(null);
      setRabReportFilter('all');
      setHistoryItemFilter('all');

      try {
        if (selectedId) {
          // Load the selected project's RAB items and report history.
          const [pekerjaanRes, progresRes] = await Promise.all([
            fetch(`/api/pekerjaan?proyek_id=${selectedId}`),
            fetch(`/api/progres?proyek_id=${selectedId}&mandor_id=${mandorId}`),
          ]);

          const pekerjaanJson = await pekerjaanRes.json();
          const progresJson = await progresRes.json();

          if (!isCancelled) {
            setRabItems(pekerjaanJson.success ? pekerjaanJson.data || [] : []);
            setProyekDetail(pekerjaanJson.success ? pekerjaanJson.proyek || null : null);
            const projectReports = progresJson.success ? progresJson.data || [] : [];
            setHistory(projectReports);
            reportStatusesRef.current = {
              projectId: String(selectedId),
              statuses: new Map(projectReports.map((report) => [String(report.id), report.status_verifikasi])),
            };
          }
        } else {
          // Load all reports submitted by this foreman when no project is selected.
          const progresRes = await fetch(`/api/progres?mandor_id=${mandorId}`);
          const progresJson = await progresRes.json();

          if (!isCancelled) {
            setRabItems([]);
            setProyekDetail(null);
            setHistory(progresJson.success ? progresJson.data || [] : []);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setRabItems([]);
          setHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      reportStatusesRef.current = { projectId: null, statuses: null };
      return undefined;
    }

    let isCancelled = false;
    const syncReportStatuses = async () => {
      const currentMandorId = localStorage.getItem('user_id') || '';
      if (!currentMandorId) return;
      try {
        const response = await fetch(
          `/api/progres?proyek_id=${selectedId}&mandor_id=${currentMandorId}`
        );
        const result = await response.json();
        if (!response.ok || !result.success || isCancelled) return;

        const nextReports = result.data || [];
        const previous = reportStatusesRef.current;
        const nextStatuses = new Map(
          nextReports.map((report) => [String(report.id), report.status_verifikasi])
        );
        if (previous.projectId === String(selectedId) && previous.statuses) {
          const approvedReport = nextReports.find(
            (report) =>
              report.status_verifikasi === 'approved' &&
              ['pending', 'rejected'].includes(previous.statuses.get(String(report.id)))
          );
          if (approvedReport) {
            showReportSuccess(
              'Report approved',
              `Your progress report for "${approvedReport.nama_pekerjaan}" (Week ${approvedReport.minggu_ke}) was approved by the supervisor.`
            );
          }
        }

        reportStatusesRef.current = { projectId: String(selectedId), statuses: nextStatuses };
        setHistory(nextReports);
      } catch (error) {
        console.error('Could not refresh report statuses:', error);
      }
    };

    const intervalId = window.setInterval(syncReportStatuses, 15000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedId]);

  // Map item reports for quick count
  const itemReportsMap = useMemo(() => {
    const map = {};
    for (const h of history) {
      if (!map[h.item_pekerjaan_id]) {
        map[h.item_pekerjaan_id] = [];
      }
      map[h.item_pekerjaan_id].push(h);
    }
    return map;
  }, [history]);

  // Filtered RAB items
  const filteredRabItems = useMemo(() => {
    const q = rabSearch.trim().toLowerCase();
    return rabItems.filter((item) => {
      const hasReports = Boolean(itemReportsMap[item.id]?.length);
      const matchesReportFilter =
        rabReportFilter === 'all' ||
        (rabReportFilter === 'reported' && hasReports) ||
        (rabReportFilter === 'not-reported' && !hasReports);
      const matchesSearch =
        !q ||
        String(item.kode_pekerjaan || '').toLowerCase().includes(q) ||
        String(item.nama_pekerjaan || '').toLowerCase().includes(q);
      return matchesReportFilter && matchesSearch;
    });
  }, [rabItems, rabSearch, rabReportFilter, itemReportsMap]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        String(p.nama_proyek || '').toLowerCase().includes(q) ||
        String(p.lokasi || '').toLowerCase().includes(q)
    );
  }, [projects, projectSearch]);

  const pendingCount = history.filter((h) => h.status_verifikasi === 'pending').length;
  const approvedCount = history.filter((h) => h.status_verifikasi === 'approved').length;
  const rejectedCount = history.filter((h) => h.status_verifikasi === 'rejected').length;

  const visibleHistory = history.filter(
    (h) =>
      (historyFilter === 'all' || h.status_verifikasi === historyFilter) &&
      (historyItemFilter === 'all' || String(h.item_pekerjaan_id) === historyItemFilter)
  );
  const reportedItemCount = rabItems.filter((item) => itemReportsMap[item.id]?.length).length;
  const unreportedItemCount = rabItems.length - reportedItemCount;

  useEffect(() => {
    if (rabListRef.current) rabListRef.current.scrollTop = 0;
  }, [rabReportFilter, rabSearch, selectedId]);

  const captureRabLayout = () => {
    const list = rabListRef.current;
    if (!list) return;

    rabLayoutBeforeFilterRef.current = {
      height: list.getBoundingClientRect().height,
      cards: new Map(
        Array.from(list.querySelectorAll('[data-rab-card]')).map((card) => [
          card.dataset.rabCard,
          card.getBoundingClientRect().top,
        ])
      ),
    };
  };

  useLayoutEffect(() => {
    const list = rabListRef.current;
    const previousLayout = rabLayoutBeforeFilterRef.current;
    if (!list || !previousLayout) return;
    rabLayoutBeforeFilterRef.current = null;

    const nextHeight = list.getBoundingClientRect().height;
    const heightAnimation =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      Math.abs(previousLayout.height - nextHeight) < 1
        ? null
        : list.animate(
            [
              { height: `${previousLayout.height}px` },
              { height: `${nextHeight}px` },
            ],
            { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );

    Array.from(list.querySelectorAll('[data-rab-card]')).forEach((card) => {
      const previousTop = previousLayout.cards.get(card.dataset.rabCard);
      if (previousTop == null) {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          card.animate(
            [
              { opacity: 0, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 220, easing: 'ease-out' }
          );
        }
        return;
      }

      const offset = previousTop - card.getBoundingClientRect().top;
      if (
        offset &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        card.animate(
          [
            { transform: `translateY(${offset}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
    });

    return () => heightAnimation?.cancel();
  }, [filteredRabItems]);

  useEffect(() => {
    setActiveTab('rab');
    if (!selectedId) setHomeTab('projects');
  }, [selectedId]);

  const handleOpenReportForm = (itemId) => {
    const pid = selectedId ? `&proyek_id=${selectedId}` : '';
    router.push(`/dashboard/mandor/laporan-baru?item_id=${itemId}${pid}`);
  };

  const canManageReport = (report) =>
    (!mandorId || String(report.mandor_id) === String(mandorId)) &&
    ['pending', 'rejected'].includes(report.status_verifikasi);

  const handleEditReport = (report) => {
    const pid = report.proyek_id || selectedId;
    if (pid && String(pid) !== String(selectedId)) {
      selectProject(pid);
    }
    router.push(
      `/dashboard/mandor/laporan-baru?item_id=${report.item_pekerjaan_id}&report_id=${report.id}${pid ? `&proyek_id=${pid}` : ''}`
    );
  };

  const handleDeleteReport = async (report) => {
    clearTimeout(actionMsgTimeout.current);
    setActionMsg(null);
    setDeletingReportId(report.id);
    try {
      const response = await fetch('/api/progres', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laporan_id: report.id,
          mandor_id: Number(mandorId),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        showActionMessage({ type: 'error', text: result.message || 'Could not delete the report.' });
        return;
      }
      setHistory((current) => current.filter((entry) => entry.id !== report.id));
      setReportToDelete(null);
      showActionMessage({ type: 'success', text: result.message || 'Report deleted.' });
    } catch (error) {
      showActionMessage({ type: 'error', text: error.message || 'Could not delete the report.' });
    } finally {
      setDeletingReportId(null);
    }
  };

  return (
    <div className="space-y-4 pb-16 sm:space-y-6 md:pb-0">
      <DashboardHeader
        role="mandor"
        compactTitle
        title={selected ? (proyekDetail?.nama_proyek || selected.nama_proyek) : 'My work'}
        subtitle={
          selected
            ? (selected.lokasi || 'Active project')
            : `${projects.length} projects`
        }
      />

      {actionMsg && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${ actionMsg.type === 'success' ? 'border-orange-100 bg-orange-50 text-ink' : 'border-danger/30 bg-danger-soft text-danger' }`}
        >
          <span>{actionMsg.text}</span>
          <button
            type="button"
            onClick={() => {
              clearTimeout(actionMsgTimeout.current);
              setActionMsg(null);
            }}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 transition hover:bg-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {reportSuccess && portalReady && createPortal(
        <ActionToast
          title={reportSuccess.title}
          message={reportSuccess.message}
          onDismiss={() => {
            clearTimeout(reportSuccessTimeout.current);
            setReportSuccess(null);
          }}
        />,
        document.body
      )}

      {/* ============================================================ */}
      {/* 1. STATE: NO PROJECT SELECTED                                */}
      {/* ============================================================ */}
      {!selectedId ? (
        <>
          <div role="tablist" aria-label="Your dashboard" className="seg grid w-full grid-cols-2 sm:w-fit">
            <button
              type="button"
              role="tab"
              aria-selected={homeTab === 'projects'}
              onClick={() => setHomeTab('projects')}
              className={`seg-item isolate whitespace-nowrap px-4 ${ homeTab === 'projects' ? 'text-orange-700' : '' }`}
            >
              {homeTab === 'projects' && <TabPill layoutId="foreman-homeTab" />}
              Projects ({projects.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={homeTab === 'reports'}
              onClick={() => setHomeTab('reports')}
              className={`seg-item isolate whitespace-nowrap px-4 ${ homeTab === 'reports' ? 'text-orange-700' : '' }`}
            >
              {homeTab === 'reports' && <TabPill layoutId="foreman-homeTab" />}
              My reports ({history.length})
            </button>
          </div>

          {homeTab === 'projects' && (
            <>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={<ClipboardList className="w-4 h-4" />}
              tone="orange"
              label="Total reports submitted"
              value={history.length}
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Awaiting review"
              value={pendingCount}
              tone="amber"
            />
            <StatCard
              icon={<CheckCircle className="w-4 h-4" />}
              label="Approved"
              value={approvedCount}
              tone="emerald"
            />
            <StatCard
              icon={<XCircle className="w-4 h-4" />}
              label="Rejected"
              value={rejectedCount}
              tone="rose"
            />
          </motion.div>

          {/* Section: Select a project */}
          <section className="anim-content-enter overflow-hidden surface">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-section text-ink">Choose a project</h3>

              <label className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 shadow-sm transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 sm:w-64">
                <Search className="h-3.5 w-3.5 text-ink-secondary" />
                <input
                  type="search"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-secondary"
                />
              </label>
            </div>

            <div className="sm:max-h-[500px] sm:overflow-auto">
              <div className="hidden overflow-x-auto lg:block">
              <table className="table-soft w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-canvas text-xs text-ink-secondary shadow-[inset_0_-1px_0_theme(colors.line)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Project Name</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 text-right font-medium">Cost Estimate Items</th>
                    <th className="px-4 py-3 font-medium">Start Date</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredProjects.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{p.nama_proyek}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">{p.lokasi || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-ink">
                        {p.rab_count != null ? p.rab_count : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">{formatDate(p.tgl_mulai)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => selectProject(p.id)}
                          className="btn-primary px-3"
                        >
                          Open Project
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div className="divide-y divide-line lg:hidden">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="space-y-3 p-4 even:bg-canvas">
                    <div>
                      <h4
                        title={project.nama_proyek}
                        className="line-clamp-2 break-words text-sm font-semibold leading-5 text-ink"
                      >
                        {project.nama_proyek}
                      </h4>
                      <p className="mt-1 text-xs text-ink-secondary">{project.lokasi || 'Location not set'}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                      <span>{project.rab_count ?? '—'} work items</span>
                      <span>Started {formatDate(project.tgl_mulai)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectProject(project.id)}
                      className="btn-primary w-full px-3"
                    >
                      View project
                    </button>
                  </div>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <p className="px-4 py-12 text-center text-xs text-ink-secondary">
                  {projects.length ? 'No projects match your search.' : 'No projects yet.'}
                </p>
              )}
            </div>
          </section>
            </>
          )}

          {/* Section: All foreman reports */}
          {homeTab === 'reports' && <section key="all-reports" className="anim-content-enter overflow-hidden surface">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-section text-ink">Report History</h3>
              </div>

              <div role="group" aria-label="Filter report status" className="seg max-w-full overflow-x-auto">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setHistoryFilter(filter.value)}
                    className={`seg-item isolate whitespace-nowrap shrink-0 px-3 ${ historyFilter === filter.value ? 'text-orange-700' : '' }`}
                  >
                    {historyFilter === filter.value && <TabPill layoutId="foreman-historyFilter" />}
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:max-h-[460px] sm:overflow-auto">
              {visibleHistory.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-ink">
                    {history.length ? 'No reports with this status.' : 'No reports submitted yet.'}
                  </p>
                </div>
              ) : (
                <div className="hidden overflow-x-auto lg:block">
                <table className="table-soft w-full min-w-[640px] text-left text-sm">
                  <thead className="sticky top-0 z-[1] bg-canvas text-xs text-ink-secondary shadow-[inset_0_-1px_0_theme(colors.line)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Work Item</th>
                      <th className="px-4 py-3 font-medium">Week</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 text-right font-medium">Progress</th>
                      <th className="px-4 py-3 text-right font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visibleHistory.map((report) => (
                      <tr key={report.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{report.nama_pekerjaan}</p>
                          <p className="text-xs text-ink-secondary">
                            {report.nama_proyek ? `${report.nama_proyek} · ` : ''}[{report.kode_pekerjaan}] · Weight: {report.bobot_persen}%
                          </p>
                          {report.catatan_pengawas && (
                            <p className="mt-1 text-xs text-warning-text bg-warning-soft rounded-lg px-2 py-1 ring-1 ring-warning/30">
                              Supervisor Note: {report.catatan_pengawas}
                            </p>
                          )}
                          {report.foto_bukti && (
                            <button
                              type="button"
                              onClick={() => setLightboxPhoto({
                                src: report.foto_bukti,
                                alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                                subtitle: `Submitted on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                              })}
                              className="group relative mt-2 block overflow-hidden rounded-md border border-line transition hover:border-orange-500 hover:shadow-card focus:outline-none"
                            >
                              <img
                                src={report.foto_bukti}
                                alt={`Progress evidence for week ${report.minggu_ke}`}
                                className="h-14 w-20 rounded-md object-cover transition duration-200 group-hover:scale-105"
                              />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary">Week {report.minggu_ke}</td>
                        <td className="px-4 py-3 text-xs text-ink-secondary">{formatDate(report.tgl_laporan)}</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-ink">
                          {Number(report.realisasi_bobot)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusBadge status={report.status_verifikasi} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManageReport(report) ? (
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditReport(report)}
                                className="btn-secondary px-2.5"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportToDelete(report)}
                                className="btn-danger-outline px-2.5"
                              >
                                Delete
                              </button>
                            </div>
                          ) : report.status_verifikasi === 'approved' ? (
                            <span className="text-xs text-ink-secondary">Locked</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
              {visibleHistory.length > 0 && (
                <div className="divide-y divide-line lg:hidden">
                  {visibleHistory.map((report) => (
                    <article key={report.id} className="space-y-3 p-4 even:bg-canvas">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold leading-5 text-ink">{report.nama_pekerjaan}</h4>
                          <p className="mt-1 text-xs text-ink-secondary">
                            {report.nama_proyek ? `${report.nama_proyek} · ` : ''}[{report.kode_pekerjaan}] · Week {report.minggu_ke}
                          </p>
                        </div>
                        <StatusBadge status={report.status_verifikasi} />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                        <span>{formatDate(report.tgl_laporan)}</span>
                        <span className="font-semibold text-ink">{Number(report.realisasi_bobot)}% progress</span>
                      </div>
                      {report.catatan_pengawas && (
                        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-5 text-warning-text">
                          Supervisor note: {report.catatan_pengawas}
                        </p>
                      )}
                      {report.foto_bukti && (
                        <button
                          type="button"
                          onClick={() => setLightboxPhoto({
                            src: report.foto_bukti,
                            alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                            subtitle: `Submitted on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                          })}
                          className="group relative inline-block overflow-hidden rounded-lg border border-line transition hover:border-orange-500 hover:shadow-card focus:outline-none"
                        >
                          <img
                            src={report.foto_bukti}
                            alt={`Progress evidence for week ${report.minggu_ke}`}
                            className="h-20 w-28 rounded-lg object-cover transition duration-200 group-hover:scale-105"
                          />
                        </button>
                      )}
                      {canManageReport(report) ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReport(report)}
                            className="btn-secondary px-3"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportToDelete(report)}
                            className="btn-danger-outline px-3"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-secondary">Approved reports are locked.</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>}
        </>
      ) : (
        /* ============================================================ */
        /* 2. STATE: PROJECT SELECTED                                   */
        /* Foreman view: RAB items and project report history             */
        /* ============================================================ */
        <>
          {/* Subheader: Tab & Deselect */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Project sections" className="seg grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'rab'}
                onClick={() => setActiveTab('rab')}
                className={`seg-item isolate whitespace-nowrap px-3 ${ activeTab === 'rab' ? 'text-orange-700' : '' }`}
              >
                {activeTab === 'rab' && <TabPill layoutId="foreman-activeTab" />}
                <Layers className="h-3.5 w-3.5" />
                Work items ({rabItems.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'laporan'}
                onClick={() => setActiveTab('laporan')}
                className={`seg-item isolate whitespace-nowrap px-3 ${ activeTab === 'laporan' ? 'text-orange-700' : '' }`}
              >
                {activeTab === 'laporan' && <TabPill layoutId="foreman-activeTab" />}
                <ClipboardList className="h-3.5 w-3.5" />
                My reports ({history.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => selectProject(null)}
              className="btn-secondary w-fit px-3.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change project
            </button>
          </div>

          {/* Stat Cards Ringkasan Pelaporan Proyek Ini */}
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={<Layers className="w-4 h-4" />}
              tone="sky"
              label="Cost Estimate Items"
              value={rabItems.length}
            />
            <StatCard
              icon={<ClipboardList className="w-4 h-4" />}
              tone="orange"
              label="Reports Submitted"
              value={history.length}
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Awaiting Review"
              value={pendingCount}
              tone="amber"
            />
            <StatCard
              icon={<CheckCircle className="w-4 h-4" />}
              label="Approved by Supervisor"
              value={approvedCount}
              tone="emerald"
            />
          </motion.div>

          {/* Section 1: RAB items available for reporting */}
          {activeTab === 'rab' && (
            <section key="work-items-panel" className="anim-content-enter overflow-hidden surface">
              <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-section text-ink">Work items</h3>

                <div className="flex min-w-0 flex-col gap-2 lg:items-end">
                  <label className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 shadow-sm transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 lg:w-64">
                    <Search className="h-3.5 w-3.5 text-ink-secondary" />
                    <input
                      type="search"
                      value={rabSearch}
                      onChange={(e) => {
                        captureRabLayout();
                        setRabSearch(e.target.value);
                      }}
                      placeholder="Search items or codes..."
                      className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-secondary"
                    />
                  </label>
                  <div role="group" aria-label="Filter work items by report status" className="seg w-full overflow-x-auto lg:w-auto">
                    {[
                      { value: 'all', label: `All (${rabItems.length})` },
                      { value: 'reported', label: `Reported (${reportedItemCount})` },
                      { value: 'not-reported', label: `Not reported (${unreportedItemCount})` },
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        aria-pressed={rabReportFilter === filter.value}
                        onClick={() => {
                          if (rabReportFilter === filter.value) return;
                          captureRabLayout();
                          setRabReportFilter(filter.value);
                        }}
                        className={`seg-item isolate whitespace-nowrap shrink-0 px-2.5 ${ rabReportFilter === filter.value ? 'text-orange-700' : '' }`}
                      >
                        {rabReportFilter === filter.value && <TabPill layoutId="foreman-rabReportFilter" />}
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                ref={rabListRef}
                className="min-h-[35vh] overflow-visible sm:h-[min(520px,65vh)] sm:min-h-[220px] sm:overflow-auto sm:overscroll-contain"
              >
                {filteredRabItems.length === 0 ? (
                  <p className="px-4 py-12 text-center text-xs text-ink-secondary">
                    {rabItems.length
                      ? 'No matching Cost Estimate items.'
                      : 'No Cost Estimate items yet.'}
                  </p>
                ) : (
                  <>
                  <div className="hidden overflow-x-auto lg:block">
                  <table className="table-soft w-full min-w-[680px] text-left text-sm">
                    <thead className="sticky top-0 z-[1] bg-canvas text-xs text-ink-secondary shadow-[inset_0_-1px_0_theme(colors.line)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Code</th>
                        <th className="px-4 py-3 font-medium">Work Item</th>
                        <th className="px-4 py-3 text-right font-medium">Volume</th>
                        <th className="px-4 py-3 text-right font-medium">Weight</th>
                        <th className="px-4 py-3 text-center font-medium">Reports</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredRabItems.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenReportForm(item.id)}
                          className="cursor-pointer"
                        >
                          <td className="px-4 py-3 text-xs font-mono text-ink-secondary">{item.kode_pekerjaan}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-ink">{item.nama_pekerjaan}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-ink-secondary tabular-nums">
                            {item.volume ? `${item.volume} ${item.satuan || ''}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="badge badge-weight tabular-nums">{item.bobot_persen}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {itemReportsMap[item.id]?.length > 0 ? (
                              <span className="badge bg-canvas text-ink">
                                {itemReportsMap[item.id].length} reports
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-secondary">Not reported</span>
                            )}
                            {itemReportsMap[item.id]?.length > 0 && (
                              <p className="mt-1 text-[10px] text-ink-secondary">
                                Weeks: {itemReportsMap[item.id]
                                  .map((report) => `${report.minggu_ke} (${report.status_verifikasi})`)
                                  .join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="btn-primary px-3">
                              <Send className="h-3 w-3" />
                              Report progress
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div className="divide-y divide-line lg:hidden">
                    {filteredRabItems.map((item) => {
                      const reports = itemReportsMap[item.id] || [];
                      return (
                        <article key={item.id} data-rab-card={item.id} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-mono text-ink-secondary">{item.kode_pekerjaan}</p>
                              <h4 className="mt-1 break-words text-sm font-semibold leading-5 text-ink">
                                {item.nama_pekerjaan}
                              </h4>
                            </div>
                            <span className="badge badge-weight shrink-0 tabular-nums">
                              {item.bobot_persen}% weight
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
                            <span>Volume: {item.volume ? `${item.volume} ${item.satuan || ''}` : '—'}</span>
                            <span>{reports.length ? `${reports.length} report${reports.length === 1 ? '' : 's'}` : 'Not reported'}</span>
                          </div>
                          {reports.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {reports.map((report) => (
                                <span
                                  key={report.id}
                                  className="rounded-full bg-canvas px-2 py-1 text-[11px] text-ink-secondary ring-1 ring-line/70"
                                >
                                  Week {report.minggu_ke} · {report.status_verifikasi}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenReportForm(item.id)}
                            className="btn-primary w-full px-3"
                          >
                            <Send className="h-4 w-4" />
                            Report progress
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Section 2: project report history */}
          {activeTab === 'laporan' && (
            <section key="project-reports-panel" className="anim-content-enter overflow-hidden surface">
              <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-section text-ink">Project Report History</h3>

                <div role="group" aria-label="Filter report status" className="seg w-fit max-w-full overflow-x-auto">
                  {[
                    { value: 'all', label: `All (${history.length})` },
                    { value: 'pending', label: `Pending (${pendingCount})` },
                    { value: 'approved', label: `Approved (${approvedCount})` },
                    { value: 'rejected', label: `Rejected (${rejectedCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setHistoryFilter(filter.value)}
                      className={`seg-item isolate whitespace-nowrap shrink-0 px-3 ${ historyFilter === filter.value ? 'text-orange-700' : '' }`}
                    >
                      {historyFilter === filter.value && <TabPill layoutId="foreman-historyFilter" />}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-line px-4 py-3">
                <label className="flex min-w-0 flex-col gap-1.5 text-xs text-ink-secondary sm:flex-row sm:items-center sm:gap-2">
                  <span className="shrink-0 font-medium">Filter by work item</span>
                  <select
                    value={historyItemFilter}
                    onChange={(event) => setHistoryItemFilter(event.target.value)}
                    className="min-w-0 max-w-full rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink shadow-sm hover:border-line focus:border-orange-500 focus:ring-2 focus:ring-orange-100 sm:max-w-md"
                  >
                    <option value="all">All work items</option>
                    {rabItems.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        [{item.kode_pekerjaan}] {item.nama_pekerjaan}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="min-h-[35vh] overflow-visible sm:h-[min(520px,65vh)] sm:min-h-[220px] sm:overflow-auto sm:overscroll-contain">
                {visibleHistory.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-ink">
                      {history.length ? 'No reports with this status.' : 'No reports for this project yet.'}
                    </p>
                    {!history.length && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab('rab')}
                          className="btn-primary mt-3 px-4"
                        >
                          View work items
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                  <div className="hidden overflow-x-auto lg:block">
                  <table key={`${historyFilter}-${historyItemFilter}`} className="table-soft w-full min-w-[680px] animate-[fade-in_180ms_ease-out] text-left text-sm">
                    <thead className="sticky top-0 z-[1] bg-canvas text-xs text-ink-secondary shadow-[inset_0_-1px_0_theme(colors.line)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Work Item</th>
                        <th className="px-4 py-3 font-medium">Week</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">Actual</th>
                        <th className="px-4 py-3 text-right font-medium">Supervisor Status</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {visibleHistory.map((report) => (
                        <tr key={report.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink">{report.nama_pekerjaan}</p>
                            <p className="text-xs text-ink-secondary">[{report.kode_pekerjaan}] · Weight: {report.bobot_persen}%</p>
                            {report.catatan_pengawas && (
                              <p className="mt-1 text-xs text-warning-text bg-warning-soft rounded-lg px-2 py-1 ring-1 ring-warning/30">
                                Supervisor Note: {report.catatan_pengawas}
                              </p>
                            )}
                            {report.foto_bukti && (
                              <button
                                type="button"
                                onClick={() => setLightboxPhoto({
                                  src: report.foto_bukti,
                                  alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                                  subtitle: `Submitted on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                                })}
                                className="group relative mt-2 block overflow-hidden rounded-md border border-line transition hover:border-orange-500 hover:shadow-card focus:outline-none"
                              >
                                <img
                                  src={report.foto_bukti}
                                  alt={`Progress evidence for week ${report.minggu_ke}`}
                                  className="h-14 w-20 rounded-md object-cover transition duration-200 group-hover:scale-105"
                                />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-secondary">Week {report.minggu_ke}</td>
                          <td className="px-4 py-3 text-xs text-ink-secondary">{formatDate(report.tgl_laporan)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-ink">
                            {Number(report.realisasi_bobot)}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={report.status_verifikasi} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManageReport(report) ? (
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditReport(report)}
                                  className="btn-secondary px-2.5"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReportToDelete(report)}
                                  className="btn-danger-outline px-2.5"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : report.status_verifikasi === 'approved' ? (
                              <span className="text-xs text-ink-secondary">Locked</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div key={`${historyFilter}-${historyItemFilter}`} className="divide-y divide-line animate-[fade-in_180ms_ease-out] lg:hidden">
                    {visibleHistory.map((report) => (
                      <article key={report.id} className="space-y-3 p-4 even:bg-canvas">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="break-words text-sm font-semibold leading-5 text-ink">
                              {report.nama_pekerjaan}
                            </h4>
                            <p className="mt-1 text-xs text-ink-secondary">
                              [{report.kode_pekerjaan}] · Week {report.minggu_ke}
                            </p>
                          </div>
                          <StatusBadge status={report.status_verifikasi} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
                          <span>{formatDate(report.tgl_laporan)}</span>
                          <span className="font-semibold text-ink">
                            {Number(report.realisasi_bobot)}% actual
                          </span>
                        </div>
                        {report.catatan_pengawas && (
                          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-5 text-warning-text">
                            Supervisor note: {report.catatan_pengawas}
                          </p>
                        )}
                        {report.foto_bukti && (
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto({
                              src: report.foto_bukti,
                              alt: `Week ${report.minggu_ke} · ${report.nama_pekerjaan}`,
                              subtitle: `Submitted on ${formatDate(report.tgl_laporan)} · Status: ${report.status_verifikasi}`
                            })}
                            className="group relative inline-block overflow-hidden rounded-lg border border-line transition hover:border-orange-500 hover:shadow-card focus:outline-none"
                          >
                            <img
                              src={report.foto_bukti}
                              alt={`Progress evidence for week ${report.minggu_ke}`}
                              className="h-20 w-28 rounded-lg object-cover transition duration-200 group-hover:scale-105"
                            />
                          </button>
                        )}
                        {canManageReport(report) ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditReport(report)}
                              className="btn-secondary px-3"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportToDelete(report)}
                              className="btn-danger-outline px-3"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-ink-secondary">Approved reports are locked.</p>
                        )}
                      </article>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </section>
          )}
        </>
      )}
      {/* Mobile Floating Action Button (FAB) for quick report submission */}
      {selectedId && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/mandor/laporan-baru')}
          aria-label="Submit progress report"
          className="btn-primary fixed bottom-5 right-5 z-30 px-4 active:scale-95 md:hidden"
        >
          <Send className="h-4 w-4" />
          <span>+ Report</span>
        </button>
      )}

      {/* Delete Report Confirmation Modal */}
      {reportToDelete && portalReady && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center min-h-screen overflow-y-auto bg-navy-950/40 p-4 modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingReportId) {
              setReportToDelete(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-report-title"
            aria-describedby="delete-report-description"
            className="modal-panel w-full max-w-sm rounded-dialog border border-line bg-surface p-5 shadow-dialog"
          >
            <h2 id="delete-report-title" className="text-base font-semibold text-ink">
              Delete this report?
            </h2>
            <p id="delete-report-description" className="mt-2 text-sm leading-6 text-ink-secondary">
              The report for Week {reportToDelete.minggu_ke} will be permanently deleted. This action cannot be undone.
            </p>
            {actionMsg?.type === 'error' && (
              <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
                {actionMsg.text}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingReportId)}
                onClick={() => setReportToDelete(null)}
                className="btn-secondary px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingReportId)}
                onClick={() => handleDeleteReport(reportToDelete)}
                className="btn-danger px-4 disabled:cursor-wait"
              >
                {deletingReportId ? 'Deleting...' : 'Delete report'}
              </button>
            </div>
          </section>
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
