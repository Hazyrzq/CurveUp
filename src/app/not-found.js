import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 anim-fade">
      <div className="glass relative overflow-hidden rounded-3xl border border-white/70 px-10 py-12 text-center shadow-shell ring-1 ring-navy-900/5 anim-shell before:absolute before:inset-x-0 before:top-0 before:h-1 before:accent-bar">
        <p className="text-gradient-brand text-3xl font-semibold mb-2">404</p>
        <p className="text-sm text-navy-500 mb-6">Page not found</p>
        <Link href="/login" className="btn-press inline-block px-5 py-2.5 bg-navy-950 hover:bg-navy-800 hover:shadow-glow text-white text-sm rounded-xl">
          Go back
        </Link>
      </div>
    </div>
  );
}
