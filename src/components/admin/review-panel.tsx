"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Clock, ChevronDown, ChevronUp, CheckCircle2, X } from "lucide-react"
import { saveAdminReview, bulkMarkResolved } from "@/lib/actions/admin-reviews"
import type { TesterSection, HistoryEntry } from "@/app/admin/projects/[slug]/review/page"

type SaveStatus = "idle" | "saving" | "saved" | "error"

const STATUS_PILL: Record<string, string> = {
  Pass: "bg-green-100 text-green-800",
  Fail: "bg-red-100 text-red-800",
  "N/A": "bg-gray-100 text-gray-700",
  Blocked: "bg-amber-100 text-amber-800",
  "—": "bg-gray-100 text-gray-500",
}

const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

const ACTOR_STYLES: Record<string, string> = {
  Candidate: "bg-sky-50 text-sky-800 border-sky-200",
  Talkpush: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Recruiter: "bg-violet-50 text-violet-800 border-violet-200",
}

const BEHAVIOR_OPTIONS = [
  { value: "Expected Behavior", activeStyle: "bg-green-600 text-white border-green-600" },
  { value: "Bug/Glitch", activeStyle: "bg-red-600 text-white border-red-600" },
  { value: "Configuration Issue", activeStyle: "bg-orange-500 text-white border-orange-500" },
  { value: "For Retesting", activeStyle: "bg-blue-600 text-white border-blue-600" },
] as const

const RESOLUTION_OPTIONS = [
  { value: "Not Yet Started", activeStyle: "bg-gray-500 text-white border-gray-500" },
  { value: "In Progress", activeStyle: "bg-blue-500 text-white border-blue-500" },
  { value: "Done", activeStyle: "bg-green-600 text-white border-green-600" },
] as const

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Friendly field/value labels                                        */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<string, string> = {
  behavior_type: "Behavior Type",
  resolution_status: "Resolution Status",
  notes: "Notes",
}

function displayValue(value: string | null): string {
  if (value === null || value === "") return "—"
  // Truncate long notes in timeline
  if (value.length > 60) return value.slice(0, 57) + "..."
  return value
}

/* ------------------------------------------------------------------ */
/*  Activity Timeline                                                   */
/* ------------------------------------------------------------------ */

function ActivityTimeline({ history }: { history: HistoryEntry[] }) {
  const [expanded, setExpanded] = useState(false)

  if (history.length === 0) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 transition-colors"
      >
        <Clock className="h-3 w-3" />
        <span className="font-medium">
          Activity ({history.length})
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 ml-1.5 border-l-2 border-violet-100 pl-3 space-y-2">
          {history.map((entry, i) => (
            <div key={i} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-violet-300" />
              <div className="text-xs">
                <span className="text-gray-400">{relativeTime(entry.changedAt)}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="font-medium text-violet-700">
                  {FIELD_LABELS[entry.fieldChanged] || entry.fieldChanged}
                </span>
                <span className="text-gray-400">
                  {" "}
                  {displayValue(entry.oldValue)} → {displayValue(entry.newValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  StepRow                                                             */
/* ------------------------------------------------------------------ */

interface StepRowProps {
  step: TesterSection["steps"][0]
  testerId: string
  projectSlug: string
  selected: boolean
  onToggle: (key: string) => void
}

function StepRow({ step, testerId, projectSlug, selected, onToggle }: StepRowProps) {
  const [behaviorType, setBehaviorType] = useState<string | null>(
    step.adminReview?.behaviorType ?? null
  )
  const [resolutionStatus, setResolutionStatus] = useState<string>(
    step.adminReview?.resolutionStatus ?? "Not Yet Started"
  )
  const [notes, setNotes] = useState<string>(step.adminReview?.notes ?? "")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const selectionKey = `${testerId}::${step.checklistItemId}`
  const showCheckbox = resolutionStatus !== "Done"

  const saveReview = async (
    newBehavior: string | null,
    newResolution: string,
    newNotes: string
  ) => {
    setSaveStatus("saving")
    const result = await saveAdminReview({
      checklistItemId: step.checklistItemId,
      testerId,
      behaviorType: newBehavior,
      resolutionStatus: newResolution,
      notes: newNotes || null,
      projectSlug,
    })
    setSaveStatus(result.error ? "error" : "saved")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  const handleBehaviorClick = (opt: string) => {
    const next = opt === behaviorType ? null : opt
    setBehaviorType(next)
    saveReview(next, resolutionStatus, notes)
  }

  const handleResolutionClick = (opt: string) => {
    setResolutionStatus(opt)
    saveReview(behaviorType, opt, notes)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveReview(behaviorType, resolutionStatus, value)
    }, 500)
  }

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Step info row */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {/* Bulk selection checkbox */}
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(selectionKey)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0 cursor-pointer"
              aria-label={`Select step ${step.stepNumber} for bulk action`}
            />
          )}

          {/* Step number */}
          <span className="w-7 h-7 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center flex-shrink-0">
            {step.stepNumber}
          </span>

          {/* Path badge */}
          {step.path && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                PATH_STYLES[step.path] ?? "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {step.path}
            </span>
          )}

          {/* Actor badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
              ACTOR_STYLES[step.actor] ?? "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {step.actor}
          </span>

          {/* Tester status pill */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              STATUS_PILL[step.testerStatus] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {step.testerStatus === "Blocked" ? "Up For Review" : step.testerStatus}
          </span>
        </div>

        {/* Action text */}
        <p className="text-sm text-gray-700 leading-relaxed mb-1">{step.action}</p>

        {/* Tester comment */}
        {step.testerComment && (
          <p className="text-xs text-gray-400 italic mt-1">
            &ldquo;{step.testerComment}&rdquo;
          </p>
        )}
      </div>

      {/* Admin review controls */}
      <div className="mx-4 mb-3 bg-violet-50/40 border border-violet-100 rounded-lg px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
          <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
            Admin Review
          </span>
          <div className="ml-auto">
            {saveStatus === "saving" && (
              <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-violet-600">Saved ✓</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-red-500">Error saving</span>
            )}
          </div>
        </div>

        {/* Behavior Type */}
        <div>
          <p className="text-xs text-violet-600 font-medium mb-1.5">Behavior Type</p>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIOR_OPTIONS.map(({ value, activeStyle }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleBehaviorClick(value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
                  behaviorType === value
                    ? activeStyle
                    : "border-violet-200 text-violet-700 hover:bg-violet-100"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Status */}
        <div>
          <p className="text-xs text-violet-600 font-medium mb-1.5">Resolution Status</p>
          <div className="flex gap-1.5">
            {RESOLUTION_OPTIONS.map(({ value, activeStyle }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleResolutionClick(value)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
                  resolutionStatus === value
                    ? activeStyle
                    : "border-violet-200 text-violet-700 hover:bg-violet-100"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Findings / Notes */}
        <div>
          <p className="text-xs text-violet-600 font-medium mb-1.5">Findings / Comments</p>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add findings, reproduction steps, or notes..."
            rows={3}
            className="w-full text-sm rounded-lg border border-violet-200 bg-white px-3 py-2
              placeholder:text-gray-400 text-gray-800 resize-none
              focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200
              transition-colors"
          />
        </div>

        {/* Activity Timeline */}
        <ActivityTimeline history={step.history} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ReviewPanel                                                         */
/* ------------------------------------------------------------------ */

interface Props {
  testerSections: TesterSection[]
  projectSlug: string
}

export default function ReviewPanel({ testerSections, projectSlug }: Props) {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const toggleItem = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleAllForTester = (testerId: string, steps: TesterSection["steps"]) => {
    const unresolvedKeys = steps
      .filter((s) => (s.adminReview?.resolutionStatus ?? "Not Yet Started") !== "Done")
      .map((s) => `${testerId}::${s.checklistItemId}`)

    const allSelected = unresolvedKeys.every((k) => selectedItems.has(k))

    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all for this tester
        unresolvedKeys.forEach((k) => next.delete(k))
      } else {
        // Select all for this tester
        unresolvedKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedItems(new Set())

  const handleBulkResolve = async () => {
    setBulkLoading(true)
    setBulkResult(null)

    const items = Array.from(selectedItems).map((key) => {
      const [testerId, checklistItemId] = key.split("::")
      return { testerId, checklistItemId }
    })

    const result = await bulkMarkResolved(items, projectSlug)

    if (result.error) {
      setBulkResult({ message: result.error, type: "error" })
      setBulkLoading(false)
    } else {
      setBulkResult({
        message: `${result.updated} item${result.updated !== 1 ? "s" : ""} marked as resolved`,
        type: "success",
      })
      setSelectedItems(new Set())
      // Refresh server data after a brief delay so the user sees the success message
      setTimeout(() => {
        router.refresh()
        setBulkResult(null)
      }, 1500)
      setBulkLoading(false)
    }
  }

  return (
    <div className="relative pb-20">
      <div className="space-y-6">
        {testerSections.map(({ tester, steps }) => {
          const doneCount = steps.filter(
            (s) => s.adminReview?.resolutionStatus === "Done"
          ).length

          const unresolvedKeys = steps
            .filter((s) => (s.adminReview?.resolutionStatus ?? "Not Yet Started") !== "Done")
            .map((s) => `${tester.id}::${s.checklistItemId}`)

          const allTesterSelected =
            unresolvedKeys.length > 0 &&
            unresolvedKeys.every((k) => selectedItems.has(k))

          const someTesterSelected =
            unresolvedKeys.some((k) => selectedItems.has(k)) && !allTesterSelected

          return (
            <div
              key={tester.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  {/* Select all checkbox for this tester */}
                  {unresolvedKeys.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allTesterSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someTesterSelected
                      }}
                      onChange={() => toggleAllForTester(tester.id, steps)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      aria-label={`Select all unresolved steps for ${tester.name}`}
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tester.name}</p>
                    <p className="text-xs text-gray-400">{tester.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {steps.length} {steps.length === 1 ? "step" : "steps"}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      doneCount === steps.length
                        ? "bg-green-100 text-green-700"
                        : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {doneCount} / {steps.length} resolved
                  </span>
                </div>
              </div>

              {/* Step rows */}
              <div>
                {steps.map((step) => (
                  <StepRow
                    key={step.checklistItemId}
                    step={step}
                    testerId={tester.id}
                    projectSlug={projectSlug}
                    selected={selectedItems.has(`${tester.id}::${step.checklistItemId}`)}
                    onToggle={toggleItem}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating bulk action bar */}
      {(selectedItems.size > 0 || bulkResult) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3">
            {bulkResult ? (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                bulkResult.type === "success" ? "text-green-700" : "text-red-600"
              }`}>
                {bulkResult.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                {bulkResult.message}
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={handleBulkResolve}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {bulkLoading ? (
                    <span className="animate-pulse">Resolving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Resolved
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
