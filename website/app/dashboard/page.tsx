'use client';

import { Header } from '@/components/header';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';

interface ListicleRow {
  id: number;
  productUrl: string;
  referenceUrl: string;
  status: 'pending' | 'completed' | 'failed';
  outputPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    failed: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? 'bg-zinc-100 text-zinc-800 border-zinc-300'}`}
    >
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-zinc-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateUrl(url: string, max = 50) {
  return url.length > max ? url.slice(0, max) + '...' : url;
}

export default function DashboardPage() {
  const [listicles, setListicles] = useState<ListicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListicles = useCallback(async () => {
    try {
      const res = await fetch('/api/listicles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setListicles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchListicles();
  }, [fetchListicles]);

  const hasPending = listicles.some((l) => l.status === 'pending');

  useEffect(() => {
    if (hasPending && !intervalRef.current) {
      intervalRef.current = setInterval(fetchListicles, 5000);
    } else if (!hasPending && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPending, fetchListicles]);

  return (
    <>
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
              {hasPending && <Spinner />}
            </div>
            <Link
              href="/create"
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
            >
              Create New
            </Link>
          </div>

          {loading && listicles.length === 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
              <Spinner />
              <p className="mt-3 text-sm text-zinc-500">Loading listicles...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && listicles.length === 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
              <p className="text-zinc-500">No listicles yet.</p>
              <Link href="/create" className="mt-2 inline-block text-sm text-zinc-900 underline">
                Create your first listicle
              </Link>
            </div>
          )}

          {listicles.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">Product URL</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">Created</th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listicles.map((l) => (
                    <tr key={l.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-4 py-3 text-zinc-900">#{l.id}</td>
                      <td
                        className="px-4 py-3 text-zinc-600 max-w-64 truncate"
                        title={l.productUrl}
                      >
                        {truncateUrl(l.productUrl)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(l.status)}</td>
                      <td className="px-4 py-3 text-zinc-500">{formatDate(l.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {l.status === 'completed' && l.outputPath && (
                          <Link
                            href={`/listicles/${l.id}/index.html`}
                            className="text-sm text-zinc-900 underline hover:text-zinc-600"
                          >
                            View Preview
                          </Link>
                        )}
                        {l.status === 'failed' && l.errorMessage && (
                          <span className="text-sm text-red-600 cursor-help" title={l.errorMessage}>
                            Error
                          </span>
                        )}
                        {l.status === 'pending' && (
                          <span className="text-sm text-zinc-400">Processing...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
