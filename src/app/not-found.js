import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 anim-fade">
      <div className="surface relative overflow-hidden rounded-3xl px-10 py-12 text-center shadow-shell anim-shell">
        <p className="text-gradient-brand text-3xl font-semibold mb-2">404</p>
        <p className="text-sm text-navy-500 mb-6">Page not found</p>
        <Link href="/login" className="btn-primary btn-press px-5 py-2.5 text-sm">
          Go back
        </Link>
      </div>
    </div>
  );
}
