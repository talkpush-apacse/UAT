export default function ReviewLoading() {
  return (
    <div>
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-1.5 mb-6">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-3 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-3 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>

      {/* Back link */}
      <div className="flex items-center gap-1 mb-8">
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
      </div>

      {/* Title area + action buttons */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="h-3 w-24 bg-muted animate-pulse rounded mb-2" />
          <div className="h-7 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-36 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Tester sections (3 cards) */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
          >
            {/* Tester name bar */}
            <div className="flex items-center gap-3">
              <div className="h-5 w-36 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
            </div>
            {/* Step rows */}
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
