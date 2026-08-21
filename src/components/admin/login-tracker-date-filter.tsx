"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Preset = "24h" | "7d" | "14d" | "30d"

const PRESETS: { key: Preset; label: string; days: number }[] = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "14d", label: "14d", days: 14 },
  { key: "30d", label: "30d", days: 30 },
]

// Drives the login tracker's date filter via URL query params (?from=&to=)
// rather than a server action — this page has no auth check by design, so
// keeping all of its data access in the one page.tsx (not a separately
// callable action) keeps the "no auth here" surface to a single, obvious spot.
export function LoginTrackerDateFilter({ activePreset }: { activePreset: Preset | "custom" }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [popoverOpen, setPopoverOpen] = useState(false)

  function pushRange(from: Date, to: Date) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("from", from.toISOString())
    params.set("to", to.toISOString())
    router.push(`${pathname}?${params.toString()}`)
  }

  function selectPreset(days: number) {
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    pushRange(from, to)
  }

  const customLabel =
    activePreset === "custom" && customRange?.from
      ? `${customRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${(customRange.to ?? customRange.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "Custom"

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1 w-fit">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => selectPreset(p.days)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset",
            activePreset === p.key
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
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset",
              activePreset === "custom"
                ? "bg-white text-gray-900 shadow-sm font-medium"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={(range) => {
              setCustomRange(range)
              if (range?.from && range?.to) {
                const from = new Date(range.from)
                from.setHours(0, 0, 0, 0)
                const to = new Date(range.to)
                to.setHours(23, 59, 59, 999)
                pushRange(from, to)
                setPopoverOpen(false)
              }
            }}
            disabled={{ after: new Date() }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
