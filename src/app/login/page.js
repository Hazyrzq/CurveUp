'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, HardHat, Eye, EyeOff, Check } from 'lucide-react';
import ActionToast from '@/components/ActionToast';
import LoginVisual from '@/components/login/LoginVisual';

const ROLES = [
  { id: 'manajemen', label: 'Management', icon: Building2, route: '/dashboard/manajemen' },
  { id: 'pengawas', label: 'Supervisor', icon: ShieldCheck, route: '/dashboard/pengawas' },
  { id: 'mandor', label: 'Foreman', icon: HardHat, route: '/dashboard/mandor' },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('manajemen');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);
  // Visual-only transition after a successful sign-in: 'idle' -> 'success' (check icon) -> 'exit' (overlay)
  const [transition, setTransition] = useState('idle');
  const transitionTimers = useRef([]);

  useEffect(() => () => transitionTimers.current.forEach(clearTimeout), []);

  // Plays the success animation, then runs the original navigation.
  const navigateAfterTransition = (navigate) => {
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      navigate();
      return;
    }
    setTransition('success');
    transitionTimers.current.push(
      setTimeout(() => setTransition('exit'), 280),
      setTimeout(navigate, 1100)
    );
  };

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
        const text = data.message || 'Unable to sign in.';
        setErrorMsg(text);
        setToast({ title: 'Sign-in failed', message: text });
        return;
      }

      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_nama', data.user.nama);
      localStorage.setItem('user_id', String(data.user.id || ''));
      localStorage.setItem('user_username', data.user.username || username);
      sessionStorage.removeItem('curveup_selected_proyek_id');

      const target = ROLES.find((r) => r.id === data.user.role)?.route || '/dashboard/manajemen';
      navigateAfterTransition(() => router.push(target));
    } catch (err) {
      const text = 'Could not connect to the server.';
      setErrorMsg(text);
      setToast({ title: 'Connection error', message: text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-canvas flex items-center justify-center p-3 sm:p-8 anim-fade">
      {transition === 'exit' && (
        <div
          aria-hidden="true"
          className="login-overlay fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[radial-gradient(120%_90%_at_50%_40%,#fff8f1_0%,#ffe7d9_55%,#fd6925_140%)]"
        >
          <div className="login-overlay-mark flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 19c5 0 6-14 16-14" />
                <path d="M4 19h16" strokeOpacity="0.55" />
              </svg>
            </span>
            <span className="text-2xl font-semibold tracking-tight text-navy-800">CurveUp</span>
          </div>
          <svg viewBox="0 0 240 70" className="mt-6 h-16 w-60" fill="none" strokeLinecap="round">
            <path d="M6 64h228" stroke="#fd6925" strokeOpacity="0.2" strokeWidth="2" />
            <path className="login-curve" pathLength="1" d="M6 64C70 64 82 58 110 36S170 6 234 6" stroke="#fd6925" strokeWidth="4" />
          </svg>
        </div>
      )}
      {toast && (
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant="error"
          onDismiss={() => setToast(null)}
        />
      )}
      <div className="w-full max-w-6xl rounded-2xl sm:rounded-[28px] bg-white/90 backdrop-blur-xl shadow-shell overflow-hidden grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] border border-white ring-1 ring-brand-900/5 anim-shell">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 xl:px-16">
          <div
            className={`mx-auto w-full max-w-sm transition duration-300 ease-out ${
              transition === 'exit' ? '-translate-x-4 opacity-0' : ''
            }`}
          >
            <div className="mb-10 flex items-center gap-2.5 anim-up">
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 19c5 0 6-14 16-14" />
                  <path d="M4 19h16" strokeOpacity="0.55" />
                </svg>
              </span>
              <p className="text-base font-semibold tracking-tight text-navy-800">CurveUp</p>
            </div>

            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-navy-800 anim-up-1">Sign in to CurveUp</h1>
            <p className="mt-2 text-sm leading-6 text-navy-500 anim-up-1">Choose your role, then enter your account details.</p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5 anim-up-2">
              <div>
                <p className="mb-2 text-sm font-medium text-navy-700">Your role</p>
                <div className="grid grid-cols-3 gap-1 rounded-2xl border border-navy-200/80 bg-navy-50/80 p-1">
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
                        className={`flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold duration-200 sm:text-[13px] ${
                          active
                            ? 'bg-white text-navy-800 shadow-soft ring-1 ring-brand-200'
                            : 'text-navy-500 hover:bg-white/70 hover:text-navy-700'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 duration-200 ${active ? 'text-brand-500' : 'text-navy-400'}`} />
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your username"
                  className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-base text-navy-800 shadow-sm placeholder:text-navy-400 hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 md:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-base text-navy-800 shadow-sm placeholder:text-navy-400 hover:border-navy-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 md:text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-brand-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && <p role="alert" className="text-sm text-rose-600 anim-up">{errorMsg}</p>}

              <button
                type="submit"
                disabled={loading || transition !== 'idle'}
                className="btn-primary btn-press w-full py-3.5 text-sm disabled:!opacity-100"
              >
                {transition !== 'idle' ? (
                  <span className="login-check inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                    <Check className="h-4 w-4" strokeWidth={3} aria-label="Signed in" />
                  </span>
                ) : loading ? (
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
        </div>

        <div className="relative hidden min-h-[620px] overflow-hidden bg-navy-950 md:flex">
          <LoginVisual />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/50 via-transparent to-navy-950/85" />
          <div className="pointer-events-none relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
            <div className="flex items-center gap-3 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">Project delivery</p>
            </div>
            <div className="max-w-md pb-2 anim-up-3">
              <p className="text-sm font-medium tracking-wide text-brand-300">FIELD AND OFFICE, IN SYNC</p>
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
