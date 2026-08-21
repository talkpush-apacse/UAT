"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChangelogRichChange {
  headline: string
  context: string
  screenshot?: string
}

export type ChangelogChange = string | ChangelogRichChange

export interface ChangelogEntry {
  version: string
  name?: string
  codename?: string
  changes: ChangelogChange[]
  deployed_at: string
}

function isRichChange(change: ChangelogChange): change is ChangelogRichChange {
  return typeof change !== "string"
}

function formatDateHeading(dateStr: string): string {
  // deployed_at is stored as YYYY-MM-DD; parse as local calendar date to
  // avoid UTC off-by-one shifting the displayed day.
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function groupByDate(entries: ChangelogEntry[]): [string, ChangelogEntry[]][] {
  const groups = new Map<string, ChangelogEntry[]>()
  for (const entry of entries) {
    const group = groups.get(entry.deployed_at)
    if (group) {
      group.push(entry)
    } else {
      groups.set(entry.deployed_at, [entry])
    }
  }
  return Array.from(groups.entries())
}

function VersionCard({ entry, defaultExpanded }: { entry: ChangelogEntry; defaultExpanded: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="bg-brand-lavender-lightest text-brand-lavender-darker font-mono text-xs rounded-full px-2.5 py-0.5 shrink-0">
            v{entry.version}
          </span>
          <span className="text-sm font-medium text-gray-800 truncate">
            {entry.name ?? entry.codename}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform shrink-0",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      {isExpanded && (
        <div className="px-4 py-4 space-y-5">
          {entry.changes.map((change, i) =>
            isRichChange(change) ? (
              <div key={i}>
                <p className="text-sm text-gray-800">
                  <span className="font-bold">{change.headline}</span>
                  {"; "}
                  <span className="text-gray-600">{change.context}</span>
                </p>
                {change.screenshot && (
                  <div className="mt-2 border border-gray-200 rounded-md overflow-hidden bg-gray-50 inline-block max-w-full">
                    <Image
                      src={change.screenshot}
                      alt={change.headline}
                      width={800}
                      height={500}
                      className="w-full h-auto max-w-2xl"
                      sizes="(max-width: 768px) 100vw, 672px"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-1.5 shrink-0 text-[6px]">&#9679;</span>
                {change}
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}

export function WhatsNewTimeline({ entries }: { entries: ChangelogEntry[] }) {
  const dateGroups = groupByDate(entries)

  if (dateGroups.length === 0) {
    return (
      <p className="text-sm text-gray-500">No updates have been logged yet.</p>
    )
  }

  return (
    <div className="space-y-10">
      {dateGroups.map(([date, versionsOnDate], groupIndex) => (
        <div key={date} className="relative pl-6">
          <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-lavender-darker" />
          {groupIndex < dateGroups.length - 1 && (
            <div className="absolute left-[4.5px] top-4 bottom-[-2.5rem] w-px bg-gray-200" />
          )}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {formatDateHeading(date)}
          </p>
          <div className="space-y-4">
            {versionsOnDate.map((entry) => (
              <VersionCard key={entry.version} entry={entry} defaultExpanded={groupIndex === 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
