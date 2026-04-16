"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Clock, ChevronDown, ChevronUp, CheckCircle2, X, FileText, File, MessageSquare } from "lucide-react"
import { saveAdminReview, bulkMarkResolved } from "@/lib/actions/admin-reviews"
import type { TesterSection, HistoryEntry, AttachmentData } from "@/app/admin/projects/[slug]/review/page"

type SaveStatus = "idle" | "saving" | "saved" | "error"

const STATUS_PILL: Record<string, string> = {
  Pass: "bg-green-100 text-green-800",
  Fail: "bg-red-100 text-red-800",
  "N/A": "bg-gray-100 text-gray-700",
  Blocked: "bg-orange-100 text-orange-800",
  "Up For Review": "bg-amber-100 text-amber-800",
  "—": "bg-gray-100 text-gray-500",
}

const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

import { ACTOR_COLORS as ACTOR_STYLES } from "@/lib/constants"

const FINDING_OPTIONS = [
  { value: "Expected Behavior", activeStyle: "bg-green-600 text-white border-green-600" },
  { value: "Bug/Glitch", activeStyle: "bg-red-600 text-white border-red-600" },
  { value: "Configuration Issue", activeStyle: "bg-orange-500 text-white border-orange-500" },
  { value: "User Error", activeStyle: "bg-yellow-500 text-white border-yellow-500" },
  { value: "Blocked", activeStyle: "bg-gray-600 text-white border-gray-600" },
] as const

const RESOLUTION_OPTIONS = [
  { value: "Not Yet Started", activeStyle: "bg-gray-500 text-white border-gray-500" },
  { value: "In Progress", activeStyle: "bg-blue-500 text-white border-blue-500" },
  { value: "For Retesting", activeStyle: "bg-blue-600 text-white border-blue-600" },
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
  finding_type: "Review Finding Type",
  behavior_type: "Behavior Type (legacy)", // kept for old history entries
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
          {history.map((entry) => (
            <div key={`${entry.fieldChanged}-${entry.changedAt}`} className="relative">
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
/*  Attachment display (read-only, admin view)                          */
/* ------------------------------------------------------------------ */

function AttachmentList({ attachments }: { attachments: AttachmentData[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {attachments.map((att) => (
        <a
          key={att.id}
          href={att.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {att.mime_type.startsWith("image/") ? (
            <span>🖼</span>
          ) : att.mime_type === "application/pdf" ? (
            <FileText className="h-3 w-3 text-red-500 flex-shrink-0" />
          ) : att.mime_type.includes("word") || att.mime_type.includes("document") ? (
            <FileText className="h-3 w-3 text-blue-500 flex-shrink-0" />
          ) : (
            <File className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )}
          <span className="max-w-[140px] truncate">{att.file_name}</span>
        </a>
      ))}
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
    step.adminReview?.findingType ?? null
  )
  const [resolutionStatus, setResolutionStatus] = useState<string>(
    step.adminReview?.resolutionStatus ?? "Not Yet Started"
  )
  const [notes, setNotes] = useState<string>(step.adminReview?.notes ?? "")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const testerComment = step.testerComment?.trim() ?? ""

  // Refs to hold the latest values — prevents stale closures in the debounced
  // notes save from overwriting behavior_type or resolution_status with old values.
  const behaviorTypeRef = useRef(behaviorType)
  const resolutionStatusRef = useRef(resolutionStatus)
  behaviorTypeRef.current = behaviorType
  resolutionStatusRef.current = resolutionStatus

  const selectionKey = `${testerId}::${step.checklistItemId}`
  const showCheckbox = resolutionStatus !== "Done"

  const saveReview = useCallback(async (
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
  }, [step.checklistItemId, testerId, projectSlug])

  const handleBehaviorClick = (opt: string) => {
    // Clear any pending notes debounce to prevent stale closure from overwriting
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const next = opt === behaviorType ? null : opt
    setBehaviorType(next)
    behaviorTypeRef.current = next
    saveReview(next, resolutionStatus, notes)
  }

  const handleResolutionClick = (opt: string) => {
    // Clear any pending notes debounce to prevent stale closure from overwriting
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setResolutionStatus(opt)
    resolutionStatusRef.current = opt
    saveReview(behaviorType, opt, notes)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Use refs instead of closure values to avoid stale data
      saveReview(behaviorTypeRef.current, resolutionStatusRef.current, value)
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
              className="h-4 w-4 rounded border-gray-300 text-brand-sage-darker focus:ring-brand-lavender-darker flex-shrink-0 cursor-pointer"
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
        {testerComment.length > 0 && (
          <div className="mt-3 rounded-md border border-gray-200 border-l-4 border-l-amber-400 bg-gray-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Tester comment</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {testerComment}
            </p>
          </div>
        )}

        {/* Tester attachments */}
        <AttachmentList attachments={step.attachments} />
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

        {/* Review Finding Type */}
        <div>
          <p className="text-xs text-violet-600 font-medium mb-1.5">Review Finding Type</p>
          <div className="flex flex-wrap gap-1.5">
            {FINDING_OPTIONS.map(({ value, activeStyle }) => (
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

const FILTER_OPTIONS: { label: string; value: string; activeStyle: string }[] = [
  { label: "All", value: "All", activeStyle: "bg-gray-800 text-white border-gray-800" },
  { label: "Not Yet Started", value: "Not Yet Started", activeStyle: "bg-gray-500 text-white border-gray-500" },
  { label: "In Progress", value: "In Progress", activeStyle: "bg-blue-500 text-white border-blue-500" },
  { label: "For Retesting", value: "For Retesting", activeStyle: "bg-blue-600 text-white border-blue-600" },
  { label: "Done", value: "Done", activeStyle: "bg-green-600 text-white border-green-600" },
]

function getEffectiveResolutionStatus(step: TesterSection["steps"][0]): string {
  return step.adminReview?.resolutionStatus ?? "Not Yet Started"
}

interface Props {
  testerSections: TesterSection[]
  projectSlug: string
}

export default function ReviewPanel({ testerSections, projectSlug }: Props) {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [resolutionFilter, setResolutionFilter] = useState<string>("All")

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

  const filteredSections =
    resolutionFilter === "All"
      ? testerSections
      : testerSections
          .map((section) => ({
            ...section,
            steps: section.steps.filter(
              (step) => getEffectiveResolutionStatus(step) === resolutionFilter
            ),
          }))
          .filter((section) => section.steps.length > 0)

  return (
    <div className="relative pb-20">
      {/* Resolution Status Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTER_OPTIONS.map(({ label, value, activeStyle }) => (
          <button
            key={value}
            type="button"
            onClick={() => setResolutionFilter(value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
              resolutionFilter === value
                ? activeStyle
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
        {resolutionFilter !== "All" && (
          <span className="text-xs text-gray-400 ml-1">
            {filteredSections.reduce((acc, s) => acc + s.steps.length, 0)} item
            {filteredSections.reduce((acc, s) => acc + s.steps.length, 0) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {filteredSections.length === 0 && resolutionFilter !== "All" ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No items with status &ldquo;{resolutionFilter}&rdquo;</p>
          <button
            type="button"
            onClick={() => setResolutionFilter("All")}
            className="mt-2 text-xs text-brand-sage-darker hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
      <div className="space-y-6">
        {filteredSections.map(({ tester, steps }) => {
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
                      className="h-4 w-4 rounded border-gray-300 text-brand-sage-darker focus:ring-brand-lavender-darker cursor-pointer"
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
      )}

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
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
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
