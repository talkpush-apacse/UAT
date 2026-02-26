export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Title area */}
        <div className="mb-8">
          <div className="h-3 w-32 bg-muted animate-pulse rounded mb-2" />
          <div className="h-7 w-52 bg-muted animate-pulse rounded" />
        </div>

        {/* Download button row */}
        <div className="flex justify-end">
          <div className="h-10 w-36 bg-muted animate-pulse rounded-lg" />
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-muted animate-pulse rounded" />
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Three stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center"
            >
              <div className="h-12 w-12 bg-muted animate-pulse rounded-full mb-3" />
              <div className="h-10 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Pie chart card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="h-5 w-44 bg-muted animate-pulse rounded mb-4" />
          <div className="h-[280px] bg-muted animate-pulse rounded-lg" />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="h-5 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-2">
            <div className="h-10 bg-muted animate-pulse rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
