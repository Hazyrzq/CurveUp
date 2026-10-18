'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Send, ArrowLeft } from 'lucide-react';
import { useProject } from '@/components/ProjectContext';

export default function MandorReportForm({ initialItemId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryItemId = initialItemId || searchParams.get('item_id');
  const reportId = searchParams.get('report_id');

  const { selectedId, selected } = useProject();
  const [form, setForm] = useState({
    item_pekerjaan_id: '',
    minggu_ke: '',
    tgl_laporan: new Date().toISOString().split('T')[0],
    realisasi_persen: '',
    foto_bukti: '',
  });
  const [itemOptions, setItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(true);
  const [msg, setMsg] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const loadItems = async () => {
    setLoadingReport(true);
    if (!selectedId) {
      setItemOptions([]);
      setForm((current) => ({ ...current, item_pekerjaan_id: '' }));
      setLoadingReport(false);
      return;
    }

    try {
      const response = await fetch(`/api/pekerjaan?proyek_id=${selectedId}`);
      const result = await response.json();
      const items = result.success ? result.data || [] : [];
      setItemOptions(items);

      let defaultId = '';
      if (queryItemId && items.some((it) => String(it.id) === String(queryItemId))) {
        defaultId = String(queryItemId);
      } else if (items[0]) {
        defaultId = String(items[0].id);
      }

      setForm((current) => ({
        ...current,
        item_pekerjaan_id: current.item_pekerjaan_id || defaultId,
      }));

      if (reportId) {
        const mandorId = Number(localStorage.getItem('user_id')) || '';
        const reportsResponse = await fetch(
          `/api/progres?proyek_id=${selectedId}&mandor_id=${mandorId}`
        );
        const reportsResult = await reportsResponse.json();
        const report = reportsResult.success
          ? (reportsResult.data || []).find((entry) => String(entry.id) === String(reportId))
          : null;

        if (!report || !['pending', 'rejected'].includes(report.status_verifikasi)) {
          setEditingReport(null);
          setMsg({
            type: 'error',
            text: 'This report cannot be edited. It may have been approved or removed.',
          });
          return;
        }

        setEditingReport(report);
        setForm({
          item_pekerjaan_id: String(report.item_pekerjaan_id),
          minggu_ke: String(report.minggu_ke),
          tgl_laporan: String(report.tgl_laporan).slice(0, 10),
          realisasi_persen: String(report.realisasi_bobot),
          foto_bukti: '',
        });
      } else {
        setEditingReport(null);
      }
    } catch {
      setItemOptions([]);
      setMsg({ type: 'error', text: 'Could not load the report form data.' });
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [selectedId, queryItemId, reportId]);

  const selectedItem = useMemo(() => {
    return itemOptions.find((it) => String(it.id) === String(form.item_pekerjaan_id)) || null;
  }, [itemOptions, form.item_pekerjaan_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMsg(null);

    const percentage = Number(String(form.realisasi_persen).replace(',', '.'));
    const week = Number(form.minggu_ke);
    if (!Number.isInteger(week) || week < 1) {
      setMsg({ type: 'error', text: 'Enter a valid week number (1 or higher).' });
      setLoading(false);
      return;
    }

    if (!Number.isFinite(percentage) || percentage < 0.01 || percentage > 100) {
      setMsg({ type: 'error', text: 'Enter a percentage between 0.01 and 100.' });
      setLoading(false);
      return;
    }

    if (selectedItem && percentage > Number(selectedItem.bobot_persen)) {
      setMsg({
        type: 'error',
        text: `Progress cannot exceed the item weight (${selectedItem.bobot_persen}%).`,
      });
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('item_pekerjaan_id', form.item_pekerjaan_id);
      data.append('minggu_ke', String(week));
      data.append('tgl_laporan', form.tgl_laporan);
      data.append('realisasi_bobot', String(percentage));
      data.append('proyek_id', String(selectedId));
      data.append('mandor_id', localStorage.getItem('user_id') || '');
      if (editingReport) data.append('laporan_id', String(editingReport.id));
      if (photoFile) data.append('foto_bukti', photoFile);

      const response = await fetch('/api/progres', {
        method: editingReport ? 'PATCH' : 'POST',
        body: data,
      });
      const result = await response.json();

      if (result.success) {
        sessionStorage.setItem(
          'mandor_report_success',
          result.message || (editingReport ? 'Report updated successfully.' : 'Report submitted successfully.')
        );
        router.replace('/dashboard/mandor', { scroll: false });
      } else {
        setMsg({ type: 'error', text: result.message || 'Could not submit the report.' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'A system error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">
          {editingReport ? 'Edit Progress Report' : 'Submit Progress Report'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Submit one report per work item each week. You may resubmit after the supervisor rejects the previous report.
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {selected ? `Project: ${selected.nama_proyek}` : 'Select a project from the dashboard first.'}
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {loadingReport ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading report...</p>
        ) : reportId && !editingReport ? (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {msg?.text || 'This report is not available for editing.'}
          </p>
        ) : !selectedId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <p className="font-medium">No project selected.</p>
            <p className="mt-1 text-slate-500">Return to the dashboard to select a project.</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/mandor')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Dashboard
            </button>
          </div>
        ) : itemOptions.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <p className="font-medium">No work items are available for this project.</p>
            <p className="mt-1 text-slate-500">Management must upload an RAB file first.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Selected Work Item Info Box */}
            {selectedItem && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-medium text-slate-500">
                      [{selectedItem.kode_pekerjaan}]
                    </span>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedItem.nama_pekerjaan}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Weight</span>
                    <p className="text-sm font-semibold text-slate-900">{Number(selectedItem.bobot_persen)}%</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 border-t border-slate-200/60 pt-2 text-xs text-slate-500">
                  <span>Volume: {Number(selectedItem.volume)} {selectedItem.satuan || ''}</span>
                  <span>·</span>
                  <span>Maximum weight: {Number(selectedItem.bobot_persen)}%</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  RAB Work Item
                </span>
                <select
                  value={form.item_pekerjaan_id}
                  onChange={(event) => setForm({ ...form, item_pekerjaan_id: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {itemOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.kode_pekerjaan}] {item.nama_pekerjaan} (Weight {Number(item.bobot_persen)}%)
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">Week Number</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Example: 1, 2, 3..."
                    value={form.minggu_ke}
                    onChange={(event) =>
                      setForm({ ...form, minggu_ke: event.target.value.replace(/[^\d]/g, '') })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    Actual Progress (%)
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      max={selectedItem ? Number(selectedItem.bobot_persen) || 100 : 100}
                      step="0.01"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={form.realisasi_persen}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          realisasi_persen: event.target.value.replace(',', '.'),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      %
                    </span>
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">Report Date</span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={form.tgl_laporan}
                    onChange={(event) => setForm({ ...form, tgl_laporan: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Progress Photo {editingReport?.foto_bukti ? '(optional replacement)' : '(required)'}
                </span>
                {editingReport?.foto_bukti && (
                  <a
                    href={editingReport.foto_bukti}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 inline-flex items-center gap-2 text-xs text-slate-700 hover:underline"
                  >
                    View current photo
                  </a>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!editingReport?.foto_bukti}
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                <span className="mt-1 block text-xs text-slate-400">JPEG, PNG, or WebP, up to 5 MB.</span>
              </label>

              {msg && (
                <div
                  role="status"
                  className={`rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                    msg.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <span>{msg.text}</span>
                  {msg.type === 'success' && (
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/mandor')}
                      className="text-xs font-medium underline hover:text-emerald-950 shrink-0"
                    >
                      Back to Reports
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/mandor')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {loading ? 'Saving...' : editingReport ? 'Save Changes' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
