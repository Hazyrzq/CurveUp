'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { LogOut, Pencil, User, X } from 'lucide-react';

export default function ProfileMenu({ userNama, onNamaChange, onLogout }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ nama: '', username: '', password: '' });
  const wrapRef = useRef(null);

  const initial = (userNama || 'U').trim().charAt(0).toUpperCase();

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!editOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) setEditOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [editOpen, saving]);

  const openEdit = () => {
    setForm({
      nama: localStorage.getItem('user_nama') || '',
      username: localStorage.getItem('user_username') || '',
      password: '',
    });
    setMsg('');
    setOpen(false);
    setEditOpen(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(localStorage.getItem('user_id')),
          nama: form.nama,
          username: form.username,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg(json.message);
        return;
      }
      localStorage.setItem('user_nama', json.user.nama);
      localStorage.setItem('user_username', json.user.username);
      onNamaChange?.(json.user.nama);
      setEditOpen(false);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-50 duration-200"
          title="Profile"
        >
          <span className="w-9 h-9 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center group-hover:scale-105 duration-200">
            {initial}
          </span>
          <span className="hidden sm:block text-sm text-gray-600 max-w-[120px] truncate">{userNama || 'Profile'}</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-40 anim-up">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-xs font-semibold text-slate-800">{userNama || 'Profile'}</p>
              <p className="text-[11px] text-slate-400">Account settings</p>
            </div>
            <button
              type="button"
              onClick={openEdit}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4" />
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout?.();
                router.push('/login');
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>

      {editOpen && portalReady && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setEditOpen(false);
          }}
        >
          <form onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="profile-dialog-title" className="text-base font-semibold text-slate-900">Edit profile</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Update your account details.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                aria-label="Close profile dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Full name</span>
                <input required autoComplete="name" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Username</span>
                <input required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">New password <span className="font-normal text-slate-400">(optional)</span></span>
                <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </label>
              {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={() => setEditOpen(false)} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
