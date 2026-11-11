'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Download, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useProject } from '@/components/ProjectContext';

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export default function ImportRABPage() {
  const router = useRouter();
  const { selected, selectedId, reload } = useProject();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [proyek, setProyek] = useState({
    nama_proyek: '',
    lokasi: '',
    tgl_mulai: '',
    tgl_selesai: '',
  });

  useEffect(() => {
    if (!selected) return;
    setProyek({
      nama_proyek: selected.nama_proyek || '',
      lokasi: selected.lokasi || '',
      tgl_mulai: toDateInput(selected.tgl_mulai),
      tgl_selesai: toDateInput(selected.tgl_selesai),
    });
  }, [selected]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMsg({ type: 'error', text: 'Select an Excel file first.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/rab/import', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success) {
        setParsedData(json.data);
        setMsg({ type: 'success', text: json.message });
      } else {
        setMsg({ type: 'error', text: json.message || 'Could not read the file.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDB = async () => {
    if (!parsedData?.items?.length) return;
    if (!selectedId) {
      setMsg({ type: 'error', text: 'Select or add a project in the sidebar first.' });
      return;
    }
    if (!proyek.nama_proyek.trim()) {
      setMsg({ type: 'error', text: 'Enter a project name.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch('/api/rab/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proyek,
          proyek_id: selectedId,
          items: parsedData.items,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg({ type: 'error', text: json.message });
        return;
      }
      await reload();
      router.push('/dashboard/manajemen');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-section text-ink">Upload Cost Estimate</h2>
        <button onClick={downloadTemplate} className="btn-secondary">
          <Download className="w-4 h-4" />
          Download Cost Estimate template
        </button>
      </div>

      <p className="text-sm text-ink-secondary">
        {!selectedId ? 'Select or add a project before saving.' : `Active project: ${selected?.nama_proyek || '-'}`}
      </p>

      <div className="surface grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
        <input
          type="text"
          placeholder="Project name"
          value={proyek.nama_proyek}
          onChange={(e) => setProyek({ ...proyek, nama_proyek: e.target.value })}
          className="field"
        />
        <input
          type="text"
          placeholder="Location"
          value={proyek.lokasi}
          onChange={(e) => setProyek({ ...proyek, lokasi: e.target.value })}
          className="field"
        />
        <input
          type="date"
          aria-label="Project start date"
          value={proyek.tgl_mulai}
          onChange={(e) => setProyek({ ...proyek, tgl_mulai: e.target.value })}
          className="field"
        />
        <input
          type="date"
          aria-label="Project end date"
          value={proyek.tgl_selesai}
          onChange={(e) => setProyek({ ...proyek, tgl_selesai: e.target.value })}
          className="field"
        />
      </div>

      <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center">
        <form onSubmit={handleUpload} className="space-y-4 max-w-md mx-auto">
          <div className="chip-orange mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm text-ink-secondary">Excel or CSV file (.xlsx, .xls, .csv)</p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
            className="block w-full text-sm text-ink-secondary file:mr-4 file:h-10 file:rounded-xl file:border-0 file:bg-navy-800 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-900 file:cursor-pointer"
          />
          {file && <p className="text-sm text-ink">{file.name}</p>}
          <button
            type="submit"
            disabled={loading || !file}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : 'Preview file'}
          </button>
        </form>
      </div>

      {msg && (
        <p className={`text-sm flex items-center gap-2 ${msg.type === 'success' ? 'text-orange-700' : 'text-danger'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </p>
      )}

      {parsedData && (
        <div className="surface space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink">
              {parsedData.items_count} items · total weight {Number(parsedData.total_bobot || parsedData.total_anggaran).toFixed(2)}%
            </p>
            <button
              onClick={handleSaveToDB}
              disabled={saving}
              className="btn-primary px-4"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Cost Estimate'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-soft w-full text-left text-sm">
              <thead className="text-xs text-ink-secondary">
                <tr>
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Work item</th>
                  <th className="pb-3 font-medium text-right">Volume</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
                  <th className="pb-3 font-medium text-right">Total Price</th>
                  <th className="pb-3 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsedData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-ink-secondary">{item.kode_pekerjaan}</td>
                    <td className="py-3">{item.nama_pekerjaan}</td>
                    <td className="py-3 text-right tabular-nums text-ink-secondary whitespace-nowrap">{item.volume ? `${item.volume} ${item.satuan || ''}` : '—'}</td>
                    <td className="py-3 text-right tabular-nums text-ink-secondary whitespace-nowrap">{item.harga_satuan ? `IDR ${Number(item.harga_satuan).toLocaleString('en-US')}` : '—'}</td>
                    <td className="py-3 text-right tabular-nums whitespace-nowrap">{item.total_harga ? `IDR ${Number(item.total_harga).toLocaleString('en-US')}` : '—'}</td>
                    <td className="py-3 text-right"><span className="badge badge-weight tabular-nums">{item.bobot_persen}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
