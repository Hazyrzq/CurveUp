'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { LogOut, Pencil, User, X } from 'lucide-react';
import { useScrollLock } from '@/lib/useScrollLock';
import ActionToast from '@/components/ActionToast';

export default function ProfileMenu({ userNama, onNamaChange, onLogout }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ nama: '', username: '', password: '' });
  const wrapRef = useRef(null);

  useScrollLock(editOpen);

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
          role: localStorage.getItem('user_role') || '',
          nama: form.nama,
          username: form.username,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg(json.message);
        setToast({ title: 'Could not update profile', message: json.message, variant: 'error' });
        return;
      }
      localStorage.setItem('user_nama', json.user.nama);
      localStorage.setItem('user_username', json.user.username);
      onNamaChange?.(json.user.nama);
      setEditOpen(false);
      setToast({ title: 'Profile updated', message: json.message || 'Profile saved.', variant: 'success' });
    } catch (err) {
      setMsg(err.message);
      setToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {portalReady && toast && createPortal(
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />,
        document.body
      )}
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-navy-50 duration-200"
          title="Profile"
        >
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-navy-800 to-navy-950 text-white text-sm font-semibold flex items-center justify-center ring-2 ring-white shadow-soft group-hover:scale-105 group-hover:ring-brand-200 duration-200">
            {initial}
          </span>
          <span className="hidden sm:block text-sm text-navy-600 max-w-[120px] truncate">{userNama || 'Profile'}</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/70 glass p-1.5 shadow-lift ring-1 ring-navy-900/5 z-40 anim-up">
            <div className="border-b border-navy-100 px-3 py-2">
              <p className="truncate text-xs font-semibold text-navy-800">{userNama || 'Profile'}</p>
              <p className="text-[11px] text-navy-400">Account settings</p>
            </div>
            <button
              type="button"
              onClick={openEdit}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-navy-700 rounded-lg hover:bg-navy-50"
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
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-navy-700 rounded-lg hover:bg-navy-50"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>

      {editOpen && portalReady && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col min-h-screen bg-white sm:bg-navy-950/50 sm:items-center sm:justify-center sm:p-4 modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setEditOpen(false);
          }}
        >
          <form onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="modal-panel flex flex-col w-full h-full sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-md rounded-none sm:rounded-2xl border-0 sm:border border-navy-200 bg-white shadow-none sm:shadow-2xl overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-navy-100 px-4 py-3.5 sm:px-6 sm:py-4 bg-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="profile-dialog-title" className="text-base font-semibold text-navy-900">Edit profile</h3>
                  <p className="text-xs text-navy-500">Update your account details.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                aria-label="Close profile dialog"
                className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700 disabled:opacity-50"
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 py-4 sm:px-6 sm:py-5 pb-8 sm:pb-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-600">Full name</span>
                <input required autoComplete="name" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-base sm:text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-600">Username</span>
                <input required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-base sm:text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy-600">New password <span className="font-normal text-navy-400">(optional)</span></span>
                <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-base sm:text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </label>
              {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
            </div>
            <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-navy-100 bg-navy-50/90 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setEditOpen(false)} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-100 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-800 hover:shadow-glow disabled:opacity-60">
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
