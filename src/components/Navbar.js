'use client';

import React from 'react';
import ProfileMenu from '@/components/ProfileMenu';
import { Menu } from 'lucide-react';

export default function Navbar({ title, userNama, onNamaChange, onLogout, onMenuClick }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="dashboard-sidebar"
          aria-haspopup="dialog"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition duration-200 hover:bg-slate-100 active:scale-95 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <ProfileMenu userNama={userNama} onNamaChange={onNamaChange} onLogout={onLogout} />
      </div>
    </header>
  );
}
