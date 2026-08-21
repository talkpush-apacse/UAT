"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMcpToolUsage, type McpUsagePoint } from "@/lib/actions/mcp-usage"

const LINE_COLORS = [
  "hsl(139 30% 40%)", // sage
  "hsl(223 45% 55%)", // lavender
  "hsl(298 40% 55%)", // pink
  "hsl(36 80% 45%)", // amber
  "hsl(200 60% 45%)", // teal
  "hsl(260 45% 55%)", // violet
  "hsl(10 65% 50%)", // red-orange
  "hsl(160 40% 40%)", // deep teal-green
]
const OTHER_COLOR = "hsl(220 9% 65%)"

type Preset = "24h" | "7d" | "14d" | "30d" | "custom"

const PRESETS: { key: Preset; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
]

function rangeForPreset(preset: Preset, custom?: DateRange): { start: Date; end: Date; bucket: "hour" | "day" } {
  const end = new Date()
  if (preset === "24h") {
    return { start: new Date(end.getTime() - 24 * 60 * 60 * 1000), end, bucket: "hour" }
  }
  if (preset === "custom" && custom?.from) {
    const start = new Date(custom.from)
    start.setHours(0, 0, 0, 0)
    const customEnd = new Date(custom.to ?? custom.from)
    customEnd.setHours(23, 59, 59, 999)
    return { start, end: customEnd, bucket: "day" }
  }
  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : 30
  return { start: new Date(end.getTime() - days * 24 * 60 * 60 * 1000), end, bucket: "day" }
}

export function McpUsageChart() {
  const [preset, setPreset] = useState<Preset>("7d")
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [points, setPoints] = useState<McpUsagePoint[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { start, end, bucket } = useMemo(
    () => rangeForPreset(preset, customRange),
    [preset, customRange]
  )

  useEffect(() => {
    startTransition(async () => {
      const result = await getMcpToolUsage(start.toISOString(), end.toISOString(), bucket)
      setPoints(result.points)
      setTools(result.tools)
      setError(result.error ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.getTime(), end.getTime(), bucket])

  const totalCalls = points.reduce(
    (sum, point) => sum + tools.reduce((s, t) => s + (point[t] as number), 0),
    0
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset",
                preset === p.key
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={() => setPreset("custom")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset",
                  preset === "custom"
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {preset === "custom" && customRange?.from
                  ? `${customRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${(customRange.to ?? customRange.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range)
                  if (range?.from && range?.to) setPopoverOpen(false)
                }}
                disabled={{ after: new Date() }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-sm text-gray-500 tabular-nums">
          <span className="font-medium text-gray-700">{totalCalls}</span> tool calls in range
        </p>
      </div>

      {isPending ? (
        <div className="h-[320px] animate-pulse bg-gray-100 rounded-md" />
      ) : error ? (
        <p className="text-sm text-red-600 py-12 text-center">{error}</p>
      ) : totalCalls === 0 ? (
        <div className="text-center py-16">
          <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">No MCP tool calls in this range</p>
          <p className="text-xs text-gray-400 mt-1">Try a wider date range, or check back after some usage.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "#E5E7EB" }}
              labelStyle={{ fontWeight: 600, color: "#111827" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {tools.map((tool, i) => (
              <Line
                key={tool}
                type="monotone"
                dataKey={tool}
                stroke={tool === "Other" ? OTHER_COLOR : LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
