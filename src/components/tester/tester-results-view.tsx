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

const RESOLUTION_CONFIG: Record<
  string,
  {
    label: string
    badgeClass: string
    icon: typeof Clock
  }
> = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-100 text-amber-900",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-900",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-green-100 text-green-900",
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
        className="mb-6 inline-flex items-center gap-1.5 rounded text-sm font-bold text-primary underline underline-offset-4 hover:text-primary/70"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to UAT Steps
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          Hi {firstName}, here are your UAT results
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-700">
          {project.companyName} · status of the steps you flagged
          {submittedLabel ? ` · Submitted ${submittedLabel}` : ""}.
        </p>
      </div>

      {/* Inline stats strip */}
      <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm font-medium text-gray-700">
        <span>
          <span className="font-bold text-primary">{stats.total}</span>{" "}
          {stats.total === 1 ? "Step Tested" : "Steps Tested"}
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-bold text-green-800">{stats.passCount}</span> Passed
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-bold text-red-700">{stats.issueCount}</span>{" "}
          {stats.issueCount === 1 ? "Issue" : "Issues"}
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-bold text-primary">{stats.resolvedCount}</span> Resolved
        </span>
      </div>

      {/* Issues list */}
      {issueSteps.length === 0 ? (
        /* All-pass celebratory state */
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-primary bg-white py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-green-100">
            <PartyPopper className="h-7 w-7 text-green-800" />
          </div>
          <h3 className="mb-1 text-lg font-bold text-primary">
            All steps passed!
          </h3>
          <p className="max-w-sm text-center text-sm font-medium text-gray-700">
            Great work — you didn&apos;t report any issues during testing.
            No follow-up needed on your end.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="mb-1 text-base font-bold text-primary">
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
                className="overflow-hidden rounded-xl border-2 border-primary bg-white"
              >
                <div className="space-y-3 p-4 sm:p-5">
                  {/* Meta row: step + actor on the left, resolution badge on the right */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-medium text-gray-700">
                      <span className="font-bold text-primary">Step {item.step_number}</span> · {item.actor}
                    </p>

                    <span
                      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border-2 border-primary px-2.5 py-0.5 text-sm font-bold ${resolution.badgeClass}`}
                    >
                      <ResIcon className="h-3.5 w-3.5" />
                      {resolution.label}
                    </span>
                  </div>

                  {/* Action — promoted to heading */}
                  <p className="text-[17px] font-medium text-primary leading-snug whitespace-pre-line [overflow-wrap:anywhere]">
                    {cleanedAction}
                  </p>

                  {/* What the tester reported */}
                  <div className="text-sm font-medium text-gray-800">
                    <span>You reported </span>
                    <span
                      className={`font-bold ${
                        response.status === "Fail" ? "text-red-700" : "text-amber-800"
                      }`}
                    >
                      {response.status}
                    </span>
                    {response.comment ? (
                      <p className="mt-1 text-gray-800 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
                        {response.comment}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm italic text-gray-700">
                        No comment provided
                      </p>
                    )}
                  </div>

                  {/* Talkpush Response — own block, only when notes exist */}
                  {review?.notes && (
                    <div className="rounded-lg border-2 border-primary bg-blue-50 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <p className="text-sm font-bold text-primary">
                          Talkpush Response
                        </p>
                      </div>
                      <p className="text-sm font-medium text-primary leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
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
