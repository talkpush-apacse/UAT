export default function ProjectDetailLoading() {
  return (
    <div>
      {/* Back link */}
      <div className="h-4 w-36 bg-muted animate-pulse rounded mb-6" />

      {/* Title + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="h-6 w-56 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded mb-1" />
          <div className="h-3 w-44 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>

      {/* 6 action cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center"
          >
            <div className="h-5 w-5 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Export button */}
      <div className="flex gap-2 mb-8">
        <div className="h-9 w-44 bg-muted animate-pulse rounded-lg" />
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-200 mb-8" />

      {/* Checklist Summary */}
      <div className="mb-8">
        <div className="h-6 w-40 bg-muted animate-pulse rounded mb-3" />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-10 bg-muted animate-pulse" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse border-t border-gray-50" />
          ))}
        </div>
      </div>

      {/* Tester Progress */}
      <div className="h-6 w-36 bg-muted animate-pulse rounded mb-3" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-10 bg-muted animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted animate-pulse border-t border-gray-50" />
        ))}
      </div>
    </div>
  )
}
