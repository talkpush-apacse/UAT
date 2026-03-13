"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChangelogEntry {
  version: string
  codename: string
  changes: string[]
  deployed_at: string
}

export function ChangelogSection({ entries }: { entries: ChangelogEntry[] }) {
  const [expandedIndex, setExpandedIndex] = useState(0)

  return (
    <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
      {entries.map((entry, index) => {
        const isExpanded = expandedIndex === index
        return (
          <div
            key={entry.version}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="bg-teal-50 text-teal-700 font-mono text-xs rounded-full px-2.5 py-0.5 shrink-0">
                  v{entry.version}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {entry.codename}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">
                  {entry.deployed_at}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-3 pt-0">
                <ul className="space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-1.5 shrink-0 text-[6px]">&#9679;</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
