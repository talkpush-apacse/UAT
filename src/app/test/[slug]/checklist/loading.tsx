export default function ChecklistLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-2 w-full bg-muted animate-pulse rounded" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
