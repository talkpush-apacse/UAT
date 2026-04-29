"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  PartyPopper,
  MessageSquare,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string
  step_number: number | null
  actor: string
  action: string
  item_type?: string
}

interface Response {
  tester_id: string
  checklist_item_id: string
  status: string | null
  comment: string | null
}

interface AdminReview {
  checklist_item_id: string
  tester_id: string
  resolution_status: string
  notes: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

import { ACTOR_COLORS_MEDIUM as ACTOR_BADGE } from "@/lib/constants"

const RESOLUTION_CONFIG: Record<
  string,
  {
    label: string
    badgeClass: string
    railClass: string
    icon: typeof Clock
  }
> = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    railClass: "bg-amber-400",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    railClass: "bg-blue-400",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    railClass: "bg-green-500",
    icon: CheckCircle2,
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Some admins author "phase intro" steps with decorative ═══ / ─── / ━━━
 * runs around a heading. Those characters render as ugly raw bars in this
 * read-only view, so strip any run of 3+ such chars and collapse extra
 * whitespace before display.
 */
function cleanActionText(input: string): string {
  if (!input) return ""
  return input
    .replace(/[═─━]{3,}/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function formatSubmittedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TesterResultsView({
  project,
  testerName,
  testerId,
  submittedAt,
  checklistItems,
  responses,
  adminReviews,
}: {
  project: { slug: string; companyName: string }
  testerName: string
  testerId: string
  submittedAt?: string | null
  checklistItems: ChecklistItem[]
  responses: Response[]
  adminReviews: AdminReview[]
}) {
  const firstName = testerName.split(" ")[0]
  const submittedLabel = formatSubmittedDate(submittedAt)

  // Build lookup maps
  const responseMap = useMemo(
    () => new Map(responses.map((r) => [r.checklist_item_id, r])),
    [responses]
  )

  const reviewMap = useMemo(
    () => new Map(adminReviews.map((r) => [r.checklist_item_id, r])),
    [adminReviews]
  )

  // Compute stats
  const stats = useMemo(() => {
    const answered = responses.filter((r) => r.status !== null)
    const passCount = answered.filter((r) => r.status === "Pass").length
    const failCount = answered.filter((r) => r.status === "Fail").length
    const blockedCount = answered.filter((r) => r.status === "Blocked").length
    const issueCount = failCount + blockedCount
    const resolvedCount = adminReviews.filter((r) => r.resolution_status === "resolved").length

    return {
      total: answered.length,
      passCount,
      issueCount,
      resolvedCount,
    }
  }, [responses, adminReviews])

  // Build issue list (non-pass steps)
  const issueSteps = useMemo(() => {
    const items: {
      item: ChecklistItem
      response: Response
      review: AdminReview | undefined
    }[] = []

    for (const item of checklistItems) {
      // Phase headers can never have responses — skip them outright.
      if (item.item_type === "phase_header") continue
      const response = responseMap.get(item.id)
      if (!response || response.status === "Pass" || response.status === "N/A" || response.status === null) continue
      const review = reviewMap.get(item.id)
      items.push({ item, response, review })
    }

    return items
  }, [checklistItems, responseMap, reviewMap])

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 pt-6">
      {/* Back to checklist */}
      <Link
        href={`/test/${project.slug}/checklist?tester=${testerId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Checklist
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          {project.companyName}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">
          Hi {firstName}, here are your UAT results
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Status of the steps you flagged
          {submittedLabel ? ` · Submitted ${submittedLabel}` : ""}.
        </p>
      </div>

      {/* Inline stats strip */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-gray-500 mb-8">
        <span>
          <span className="font-semibold text-gray-900">{stats.total}</span>{" "}
          {stats.total === 1 ? "Step Tested" : "Steps Tested"}
        </span>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <span>
          <span className="font-semibold text-green-600">{stats.passCount}</span> Passed
        </span>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <span>
          <span className="font-semibold text-red-600">{stats.issueCount}</span>{" "}
          {stats.issueCount === 1 ? "Issue" : "Issues"}
        </span>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <span>
          <span className="font-semibold text-brand-sage-darker">{stats.resolvedCount}</span> Resolved
        </span>
      </div>

      {/* Issues list */}
      {issueSteps.length === 0 ? (
        /* All-pass celebratory state */
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <PartyPopper className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            All steps passed!
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-sm">
            Great work — you didn&apos;t report any issues during testing.
            No follow-up needed on your end.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Reported {issueSteps.length === 1 ? "Issue" : "Issues"} ({issueSteps.length})
          </h2>

          {issueSteps.map(({ item, response, review }) => {
            const resolutionKey = review?.resolution_status ?? "pending"
            const resolution = RESOLUTION_CONFIG[resolutionKey] ?? RESOLUTION_CONFIG.pending
            const ResIcon = resolution.icon
            const cleanedAction = cleanActionText(item.action)

            return (
              <div
                key={item.id}
                className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Color rail keyed to resolution state */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-[3px] ${resolution.railClass}`}
                />

                <div className="pl-4 pr-4 py-4 space-y-3">
                  {/* Meta row: step + actor on the left, resolution badge on the right */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs font-semibold text-gray-500">
                        Step {item.step_number}
                      </span>
                      <span aria-hidden className="text-gray-300 text-xs">
                        ·
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${ACTOR_BADGE[item.actor] ?? ""}`}
                      >
                        {item.actor}
                      </Badge>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${resolution.badgeClass}`}
                    >
                      <ResIcon className="h-3 w-3" />
                      {resolution.label}
                    </span>
                  </div>

                  {/* Action — promoted to heading */}
                  <p className="text-base font-medium text-gray-900 leading-snug whitespace-pre-line">
                    {cleanedAction}
                  </p>

                  {/* What the tester reported */}
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-500">You reported </span>
                    <span
                      className={`font-medium ${
                        response.status === "Fail" ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      {response.status}
                    </span>
                    {response.comment ? (
                      <p className="mt-1 text-gray-600 leading-relaxed whitespace-pre-line">
                        {response.comment}
                      </p>
                    ) : (
                      <p className="mt-1 text-gray-400 italic text-xs">
                        No comment provided
                      </p>
                    )}
                  </div>

                  {/* Talkpush Response — own block, only when notes exist */}
                  {review?.notes && (
                    <div className="rounded-lg bg-blue-50/70 border-l-2 border-blue-300 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        <p className="text-xs font-semibold text-blue-700">
                          Talkpush Response
                        </p>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                        {review.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
