'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Send, ArrowLeft } from 'lucide-react';
import { useProject } from '@/components/ProjectContext';
import ActionToast from '@/components/ActionToast';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function verifyImageHeader(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === 'image/png') {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    return bytes.length >= 8 && sig.every((b, idx) => bytes[idx] === b);
  }
  if (file.type === 'image/webp') {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return bytes.length >= 12 && riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

async function optimizePhotoForUpload(file) {
  if (!file || file.size <= 900 * 1024 || typeof window === 'undefined') return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function MandorReportForm({ initialItemId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryItemId = initialItemId || searchParams.get('item_id');
  const reportId = searchParams.get('report_id');
  const queryProyekId = searchParams.get('proyek_id');

  const { selectedId, selected, selectProject } = useProject();
  const activeProyekId = selectedId || (queryProyekId ? Number(queryProyekId) : null);

  useEffect(() => {
    if (!selectedId && queryProyekId) {
      selectProject(queryProyekId);
    }
  }, [selectedId, queryProyekId, selectProject]);
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
  const [toast, setToast] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => setPortalReady(true), []);

  const showError = (title, text) => {
    setMsg({ type: 'error', text });
    setToast({ title, message: text, variant: 'error' });
  };

  const loadItems = async () => {
    setLoadingReport(true);
    if (!activeProyekId) {
      setItemOptions([]);
      setForm((current) => ({ ...current, item_pekerjaan_id: '' }));
      setLoadingReport(false);
      return;
    }

    try {
      const response = await fetch(`/api/pekerjaan?proyek_id=${activeProyekId}`);
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
          `/api/progres?proyek_id=${activeProyekId}&mandor_id=${mandorId}`
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
  }, [activeProyekId, queryItemId, reportId]);

  const selectedItem = useMemo(() => {
    return itemOptions.find((it) => String(it.id) === String(form.item_pekerjaan_id)) || null;
  }, [itemOptions, form.item_pekerjaan_id]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showError('Invalid photo size', 'The photo must be 5 MB or smaller.');
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showError('Invalid file format', 'Upload a JPEG, PNG, or WebP image.');
      return;
    }

    const validHeader = await verifyImageHeader(file);
    if (!validHeader) {
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showError('Invalid image file', 'The uploaded file is not a valid image.');
      return;
    }

    setMsg(null);
    setPhotoFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMsg(null);

    const percentage = Number(String(form.realisasi_persen).replace(',', '.'));
    const week = Number(form.minggu_ke);
    if (!Number.isInteger(week) || week < 1) {
      showError('Invalid week', 'Enter a valid week number (1 or higher).');
      setLoading(false);
      return;
    }

    if (!Number.isFinite(percentage) || percentage < 0.01 || percentage > 100) {
      showError('Invalid percentage', 'Enter a percentage between 0.01 and 100.');
      setLoading(false);
      return;
    }

    if (selectedItem && percentage > Number(selectedItem.bobot_persen)) {
      showError(
        'Weight limit exceeded',
        `Progress cannot exceed the item weight (${selectedItem.bobot_persen}%).`
      );
      setLoading(false);
      return;
    }

    if (!photoFile && !editingReport?.foto_bukti) {
      showError('Missing photo evidence', 'A progress photo is required.');
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('item_pekerjaan_id', form.item_pekerjaan_id);
      data.append('minggu_ke', String(week));
      data.append('tgl_laporan', form.tgl_laporan);
      data.append('realisasi_bobot', String(percentage));
      data.append('proyek_id', String(activeProyekId));
      data.append('mandor_id', localStorage.getItem('user_id') || '');
      if (editingReport) data.append('laporan_id', String(editingReport.id));
      if (photoFile) {
        const uploadReadyPhoto = await optimizePhotoForUpload(photoFile);
        data.append('foto_bukti', uploadReadyPhoto);
      }

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
        showError('Submission rejected', result.message || 'Could not submit the report.');
      }
    } catch (error) {
      showError('Submission error', error.message || 'A system error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-navy-100 bg-white/90 shadow-soft">
      {toast && portalReady && createPortal(
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />,
        document.body
      )}
      <div className="border-b border-navy-100 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-navy-900">
          {editingReport ? 'Edit Progress Report' : 'Submit Progress Report'}
        </h3>
        <p className="mt-1 text-xs text-navy-500">
          Submit one report per work item each week. You may resubmit after the supervisor rejects the previous report.
        </p>
        <p className="mt-0.5 text-xs text-navy-500">
          {selected ? `Project: ${selected.nama_proyek}` : 'Select a project from the dashboard first.'}
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {loadingReport ? (
          <p className="py-8 text-center text-sm text-navy-500">Loading report...</p>
        ) : reportId && !editingReport ? (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {msg?.text || 'This report is not available for editing.'}
          </p>
        ) : !activeProyekId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <p className="font-medium">No project selected.</p>
            <p className="mt-1 text-navy-500">Return to the dashboard to select a project.</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/mandor')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Dashboard
            </button>
          </div>
        ) : itemOptions.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <p className="font-medium">No work items are available for this project.</p>
            <p className="mt-1 text-navy-500">Management must upload a Cost Estimate file first.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Selected Work Item Info Box */}
            {selectedItem && (
              <div className="rounded-xl border border-navy-200 bg-navy-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-medium text-navy-500">
                      [{selectedItem.kode_pekerjaan}]
                    </span>
                    <h4 className="mt-1 text-sm font-semibold text-navy-900">
                      {selectedItem.nama_pekerjaan}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-navy-400">Weight</span>
                    <p className="text-sm font-semibold text-navy-900">{Number(selectedItem.bobot_persen)}%</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 border-t border-navy-200/60 pt-2 text-xs text-navy-500">
                  <span>Volume: {Number(selectedItem.volume)} {selectedItem.satuan || ''}</span>
                  <span>·</span>
                  <span>Maximum weight: {Number(selectedItem.bobot_persen)}%</span>
                </div>
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-700">
                  Cost Estimate Work Item
                </span>
                <select
                  value={form.item_pekerjaan_id}
                  onChange={(event) => setForm({ ...form, item_pekerjaan_id: event.target.value })}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                  <span className="mb-1.5 block text-xs font-medium text-navy-700">Week Number</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Example: 1, 2, 3..."
                    value={form.minggu_ke}
                    onChange={(event) =>
                      setForm({ ...form, minggu_ke: event.target.value.replace(/[^\d]/g, '') })
                    }
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-navy-700">
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
                      className="w-full rounded-lg border border-navy-200 px-3 py-2 pr-8 text-sm text-navy-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">
                      %
                    </span>
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-700">Report Date</span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <input
                    type="date"
                    required
                    value={form.tgl_laporan}
                    onChange={(event) => setForm({ ...form, tgl_laporan: event.target.value })}
                    className="w-full rounded-lg border border-navy-200 py-2 pl-9 pr-3 text-sm text-navy-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-700">
                  Progress Photo {editingReport?.foto_bukti ? '(optional replacement)' : '(required)'}
                </span>
                {editingReport?.foto_bukti && (
                  <a
                    href={editingReport.foto_bukti}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 inline-flex items-center gap-2 text-xs text-navy-700 hover:underline"
                  >
                    View current photo
                  </a>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!editingReport?.foto_bukti}
                  onChange={handlePhotoChange}
                  className="block w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-700 file:mr-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                <span className="mt-1 block text-xs text-navy-400">JPEG, PNG, or WebP, up to 5 MB.</span>
              </label>

              {msg && (
                <div
                  role="alert"
                  className={`rounded-lg border px-3 py-2.5 text-xs flex items-center justify-between gap-2 ${
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/mandor')}
                  className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs font-medium text-navy-600 hover:bg-navy-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy-950 px-4 py-2 text-xs font-medium text-white shadow-soft hover:bg-navy-800 hover:shadow-glow transition disabled:opacity-60"
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
