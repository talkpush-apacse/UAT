"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  PartyPopper,
  Info,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string
  step_number: number
  actor: string
  action: string
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

const ACTOR_BADGE: Record<string, string> = {
  Candidate: "bg-sky-100 text-sky-800 border-sky-200",
  Recruiter: "bg-violet-100 text-violet-800 border-violet-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
}

const RESOLUTION_CONFIG: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TesterResultsView({
  project,
  testerName,
  testerId,
  checklistItems,
  responses,
  adminReviews,
}: {
  project: { slug: string; companyName: string }
  testerName: string
  testerId: string
  checklistItems: ChecklistItem[]
  responses: Response[]
  adminReviews: AdminReview[]
}) {
  const firstName = testerName.split(" ")[0]

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
    const naCount = answered.filter((r) => r.status === "N/A").length
    const issueCount = failCount + blockedCount
    const resolvedCount = adminReviews.filter((r) => r.resolution_status === "resolved").length

    return {
      total: answered.length,
      passCount,
      issueCount,
      naCount,
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
      const response = responseMap.get(item.id)
      if (!response || response.status === "Pass" || response.status === "N/A" || response.status === null) continue
      const review = reviewMap.get(item.id)
      items.push({ item, response, review })
    }

    return items
  }, [checklistItems, responseMap, reviewMap])

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12 pt-6">
      {/* Back to checklist */}
      <Link
        href={`/test/${project.slug}/checklist?tester=${testerId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Checklist
      </Link>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          {project.companyName}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">
          Hi {firstName}, here are your UAT results
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Below is the status of the steps you reported during testing.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Steps Tested</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.passCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Passed</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.issueCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Issues Reported</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-brand-sage-darker">{stats.resolvedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Resolved</p>
          </CardContent>
        </Card>
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
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700">
              Reported Issues ({issueSteps.length})
            </h2>
          </div>

          {issueSteps.map(({ item, response, review }) => {
            const resolutionKey = review?.resolution_status ?? "pending"
            const resolution = RESOLUTION_CONFIG[resolutionKey] ?? RESOLUTION_CONFIG.pending
            const ResIcon = resolution.icon

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Step header */}
                <div className="flex items-start gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                  <span className="inline-flex items-center justify-center h-6 rounded-md bg-white border border-gray-200 px-2 text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5 whitespace-nowrap">
                    Step {item.step_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium flex-shrink-0 mt-0.5 ${ACTOR_BADGE[item.actor] ?? ""}`}
                  >
                    {item.actor}
                  </Badge>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.action}</p>
                </div>

                {/* Content */}
                <div className="px-4 py-3 space-y-3">
                  {/* Your report */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Your Report
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      {response.status === "Fail" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <XCircle className="h-3 w-3" />
                          Fail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          Up For Review
                        </span>
                      )}
                    </div>
                    {response.comment ? (
                      <p className="text-sm text-gray-600 leading-relaxed mt-1">{response.comment}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-1">No comment provided</p>
                    )}
                  </div>

                  {/* Resolution status */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Resolution Status
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${resolution.className}`}
                      >
                        <ResIcon className="h-3 w-3" />
                        {resolution.label}
                      </span>
                    </div>

                    {/* Talkpush note (if admin wrote one) */}
                    {review?.notes && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                        <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-0.5">Talkpush Note</p>
                          <p className="text-sm text-blue-800 leading-relaxed">{review.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
