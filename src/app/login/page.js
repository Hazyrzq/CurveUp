'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Building2, ShieldCheck, HardHat, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  { id: 'manajemen', label: 'Management', hint: 'Manage projects', icon: Building2, route: '/dashboard/manajemen' },
  { id: 'pengawas', label: 'Supervisor', hint: 'Review reports', icon: ShieldCheck, route: '/dashboard/pengawas' },
  { id: 'mandor', label: 'Foreman', hint: 'Submit progress', icon: HardHat, route: '/dashboard/mandor' },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('manajemen');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || 'Unable to sign in.');
        return;
      }

      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_nama', data.user.nama);
      localStorage.setItem('user_id', String(data.user.id || ''));
      localStorage.setItem('user_username', data.user.username || username);

      const target = ROLES.find((r) => r.id === data.user.role)?.route || '/dashboard/manajemen';
      router.push(target);
    } catch (err) {
      setErrorMsg('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-canvas flex items-center justify-center p-3 sm:p-8 anim-fade">
      <div className="w-full max-w-6xl bg-white rounded-2xl sm:rounded-[28px] shadow-shell overflow-hidden grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] border border-slate-200/80 anim-shell">
        <div className="px-5 sm:px-10 xl:px-14 py-7 sm:py-8 flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-7 anim-up">
            <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
            <p className="text-sm font-semibold text-gray-900">CurveUp</p>
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700 anim-up-1">Project control center</p>
          <h1 className="text-3xl font-semibold text-gray-900 anim-up-1">Sign in to CurveUp</h1>
          <p className="text-sm text-gray-500 mt-2 mb-6 anim-up-1">Choose your role, then enter your account details.</p>

          <form onSubmit={handleLogin} className="space-y-4 anim-up-2">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">Your role</p>
              <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = selectedRole === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedRole(r.id);
                      setErrorMsg('');
                    }}
                    className={`flex min-h-[82px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center duration-200 ${
                      active
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 duration-200 ${active ? 'scale-110' : ''}`} />
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className={`text-[10px] leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{r.hint}</span>
                  </button>
                );
              })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base md:text-sm placeholder:text-gray-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base md:text-sm placeholder:text-gray-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-50 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && <p role="alert" className="text-sm text-red-600 anim-up">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-press w-full py-3.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <div className="relative hidden min-h-[620px] overflow-hidden bg-slate-900 md:flex">
          <Image
            src="/images/login_illustration.jpg"
            alt="A construction team reviewing project progress"
            fill
            priority
            sizes="(min-width: 768px) 52vw, 0px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/5 to-slate-950/75" />
          <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
            <div className="flex items-center gap-3 text-white">
              <span className="h-px w-8 bg-teal-300" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">Project delivery</p>
            </div>
            <div className="max-w-md pb-2 anim-up-3">
              <p className="text-sm font-medium text-teal-200">FIELD AND OFFICE, IN SYNC</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-white xl:text-4xl">A clearer view of every project.</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">
                Keep planned and actual progress in focus from the first report to handover.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
