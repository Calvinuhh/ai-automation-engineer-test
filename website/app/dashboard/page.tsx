export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <a
            href="/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New
          </a>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-zinc-600">Listicles list will be displayed here.</p>
        </div>
      </div>
    </div>
  );
}
