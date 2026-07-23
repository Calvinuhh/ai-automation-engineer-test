'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) router.push('/login');
  }

  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-zinc-900">Listicle Generator</span>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              className={`text-sm font-medium transition-colors ${
                pathname === '/create' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Create
            </Link>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
