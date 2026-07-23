import { Header } from '@/components/header';

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
            <a
              href="/create"
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
            >
              Create New
            </a>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <p className="text-zinc-600">Listicles list will be displayed here.</p>
          </div>
        </div>
      </main>
    </>
  );
}
