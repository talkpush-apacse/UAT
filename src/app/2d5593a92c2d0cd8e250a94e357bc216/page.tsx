import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { LoginTrackerDateFilter } from "@/components/admin/login-tracker-date-filter"
import { cn } from "@/lib/utils"

// Deliberately no verifyAdminSession() call — this page is reached only by
// knowing its exact (randomly generated, unlinked) URL, by design. Do not
// add an auth check here; that would defeat the point of the URL-only
// access model this page was built for. See Phase 3 scoping notes.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const MAX_ROWS = 500

function methodLabel(method: string): string {
  return method === "google" ? "Google" : "Shared password"
}

export default async function LoginTrackerPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string }
}) {
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom
  const to = searchParams.to ? new Date(searchParams.to) : now

  // Only classify as a preset when `to` is close to "now" (the presets are
  // always "last N days") and the span matches one of them exactly.
  const isDefaultWindow = !searchParams.from && !searchParams.to
  const spanDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  const endsNearNow = Math.abs(to.getTime() - now.getTime()) < 5 * 60 * 1000
  const PRESET_DAYS_TO_KEY: Record<number, "24h" | "7d" | "14d" | "30d"> = {
    1: "24h",
    7: "7d",
    14: "14d",
    30: "30d",
  }
  const activePreset = isDefaultWindow
    ? "7d"
    : endsNearNow && PRESET_DAYS_TO_KEY[spanDays]
      ? PRESET_DAYS_TO_KEY[spanDays]
      : "custom"

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("admin_login_events")
    .select("id, method, email, ip_address, user_agent, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS)

  const rows = data ?? []

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">
          Admin Login Activity
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Successful admin logins to the UAT Web Interface.
        </p>

        <div className="mb-4">
          <LoginTrackerDateFilter activePreset={activePreset} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {error ? (
            <p className="text-sm text-red-600 py-12 text-center">
              Failed to load login events.
            </p>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-medium text-gray-500">No logins in this range</p>
              <p className="text-xs text-gray-400 mt-1">Try a wider date range.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 md:hidden" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left font-medium text-gray-500 px-4 py-2.5 whitespace-nowrap">Timestamp</th>
                      <th className="text-left font-medium text-gray-500 px-4 py-2.5 whitespace-nowrap">Method</th>
                      <th className="text-left font-medium text-gray-500 px-4 py-2.5 whitespace-nowrap">Identity</th>
                      <th className="text-left font-medium text-gray-500 px-4 py-2.5 hidden md:table-cell whitespace-nowrap">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id} className={cn(i % 2 === 1 && "bg-gray-50")}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap",
                              row.method === "google"
                                ? "bg-brand-lavender-lightest text-brand-lavender-darker"
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {methodLabel(row.method)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {row.email ?? (
                            <span className="text-gray-400">Shared password login</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-xs hidden md:table-cell whitespace-nowrap">
                          {row.ip_address ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === MAX_ROWS && (
                <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
                  Showing the latest {MAX_ROWS} events — narrow your date range to see more detail.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
