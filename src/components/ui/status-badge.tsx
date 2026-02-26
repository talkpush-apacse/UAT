import { cn } from "@/lib/utils"

/** Semantic status colors — independent of brand palette */
const STATUS_STYLES: Record<string, string> = {
  Pass: "bg-green-100 text-green-800 border-green-200",
  Fail: "bg-red-100 text-red-800 border-red-200",
  "N/A": "bg-gray-100 text-gray-700 border-gray-200",
  Blocked: "bg-amber-100 text-amber-800 border-amber-200",
  "Up For Review": "bg-amber-100 text-amber-800 border-amber-200",
}

/** Resolution status styles */
const RESOLUTION_STYLES: Record<string, string> = {
  "Not Yet Started": "bg-amber-100 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  Done: "bg-green-100 text-green-700 border-green-200",
}

const FALLBACK_STYLE = "bg-gray-100 text-gray-500 border-gray-200"

interface StatusBadgeProps {
  /** The status value to display (e.g. "Pass", "Fail", "N/A", "Blocked") */
  status: string | null | undefined
  /** Optional display label override (e.g. show "Up For Review" for "Blocked") */
  label?: string
  /** Use resolution color mapping instead of test status mapping */
  variant?: "status" | "resolution"
  className?: string
}

export function StatusBadge({
  status,
  label,
  variant = "status",
  className,
}: StatusBadgeProps) {
  const displayLabel = label ?? status ?? "—"
  const styles =
    variant === "resolution"
      ? RESOLUTION_STYLES[status ?? ""] ?? FALLBACK_STYLE
      : STATUS_STYLES[status ?? ""] ?? FALLBACK_STYLE

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        styles,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
