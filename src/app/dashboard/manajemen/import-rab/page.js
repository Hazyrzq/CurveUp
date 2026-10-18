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
    link.href = '/templates/template_rab_curveup.xlsx';
    link.download = 'template_rab_curveup.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Upload RAB</h2>
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <Download className="w-4 h-4" />
          Download detailed RAB example
        </button>
      </div>

      <p className="text-sm text-gray-500">
        This RAB will be saved to the project selected in the sidebar.
        {!selectedId ? ' Select or add a project before saving.' : ` Active project: ${selected?.nama_proyek || '-'}.`}
      </p>

      <div className="rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Project name"
          value={proyek.nama_proyek}
          onChange={(e) => setProyek({ ...proyek, nama_proyek: e.target.value })}
          className="p-3 border border-gray-200 rounded-xl text-sm"
        />
        <input
          type="text"
          placeholder="Location"
          value={proyek.lokasi}
          onChange={(e) => setProyek({ ...proyek, lokasi: e.target.value })}
          className="p-3 border border-gray-200 rounded-xl text-sm"
        />
        <input
          type="date"
          aria-label="Project start date"
          value={proyek.tgl_mulai}
          onChange={(e) => setProyek({ ...proyek, tgl_mulai: e.target.value })}
          className="p-3 border border-gray-200 rounded-xl text-sm"
        />
        <input
          type="date"
          aria-label="Project end date"
          value={proyek.tgl_selesai}
          onChange={(e) => setProyek({ ...proyek, tgl_selesai: e.target.value })}
          className="p-3 border border-gray-200 rounded-xl text-sm"
        />
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
        <form onSubmit={handleUpload} className="space-y-4 max-w-md mx-auto">
          <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-600">Excel or CSV file (.xlsx, .xls, .csv)</p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-gray-900 file:text-white"
          />
          {file && <p className="text-sm text-gray-700">{file.name}</p>}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3 bg-gray-900 disabled:bg-gray-200 text-white text-sm rounded-xl"
          >
            {loading ? 'Processing...' : 'Preview file'}
          </button>
        </form>
      </div>

      {msg && (
        <p className={`text-sm flex items-center gap-2 ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </p>
      )}

      {parsedData && (
        <div className="rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {parsedData.items_count} items · total weight {Number(parsedData.total_bobot || parsedData.total_anggaran).toFixed(2)}%
            </p>
            <button
              onClick={handleSaveToDB}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save RAB'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Work item</th>
                  <th className="pb-3 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsedData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-gray-500">{item.kode_pekerjaan}</td>
                    <td className="py-3">{item.nama_pekerjaan}</td>
                    <td className="py-3 text-right">{item.bobot_persen}%</td>
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
