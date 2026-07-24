import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-md text-center px-4">
        <h1 className="text-6xl font-bold text-zinc-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Page not found</h2>
        <p className="text-sm text-zinc-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
