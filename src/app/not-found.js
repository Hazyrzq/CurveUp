import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 anim-fade">
      <div className="bg-white rounded-3xl px-10 py-12 text-center shadow-shell anim-shell">
        <p className="text-3xl font-semibold text-gray-900 mb-2">404</p>
        <p className="text-sm text-gray-500 mb-6">Page not found</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm rounded-xl">
          Go back
        </Link>
      </div>
    </div>
  );
}
