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

function ConfirmModal({
  listicleId,
  onConfirm,
  onCancel,
  loading,
}: {
  listicleId: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">Delete Listicle #{listicleId}</h3>
        <p className="text-sm text-zinc-600 mb-6">
          Are you sure you want to delete this listicle? This will remove all generated assets and
          cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Spinner />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [listicles, setListicles] = useState<ListicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listicles/${deleteTarget}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteTarget(null);
      await fetchListicles();
    } catch {
      setError('Failed to delete listicle');
    } finally {
      setDeleting(false);
    }
  }

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
                        <div className="flex items-center justify-end gap-2">
                          {l.status === 'completed' && l.outputPath && (
                            <>
                              <Link
                                href={`/listicles/${l.id}/index.html`}
                                className="text-sm text-zinc-900 underline hover:text-zinc-600"
                              >
                                View
                              </Link>
                              <a
                                href={`/api/listicles/${l.id}/download`}
                                className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
                                title="Download files"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </a>
                            </>
                          )}
                          {l.status === 'failed' && l.errorMessage && (
                            <span
                              className="text-sm text-red-600 cursor-help"
                              title={l.errorMessage}
                            >
                              Error
                            </span>
                          )}
                          {l.status === 'pending' && (
                            <span className="text-sm text-zinc-400">Processing...</span>
                          )}
                          <button
                            onClick={() => setDeleteTarget(l.id)}
                            className="text-sm text-zinc-400 hover:text-red-600 transition-colors ml-2"
                            title="Delete listicle"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {deleteTarget !== null && (
        <ConfirmModal
          listicleId={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  );
}
