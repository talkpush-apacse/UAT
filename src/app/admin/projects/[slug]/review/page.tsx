export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, Send } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import ReviewPanel from "@/components/admin/review-panel"
import PublishReviewButton from "@/components/admin/publish-review-button"
import NotifyTestersButton from "@/components/admin/notify-testers-button"
import CompleteReviewButton from "@/components/admin/complete-review-button"

export type HistoryEntry = {
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
}

export type AttachmentData = {
  id: string
  response_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

export type ReviewStep = {
  checklistItemId: string
  stepNumber: number
  path: string | null
  actor: string
  action: string
  testerStatus: string
  testerComment: string | null
  responseId: string
  attachments: AttachmentData[]
  adminReview: {
    findingType: string | null
    resolutionStatus: string
    notes: string | null
  } | null
  history: HistoryEntry[]
}

export type TesterSection = {
  tester: { id: string; name: string; email: string; mobile: string }
  steps: ReviewStep[]
}

export default async function ReviewPage({
  params,
}: {
  params: { slug: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // Group A: testers + checklist_items are independent — fetch in parallel
  const [testersResult, checklistItemsResult] = await Promise.all([
    supabase
      .from("testers")
      .select("id, name, email, mobile")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("checklist_items")
      .select("id, step_number, path, actor, action, crm_module, sort_order, item_type")
      .eq("project_id", project.id)
      // Phase headers can never have responses or admin reviews — exclude them
      // from the review queue entirely.
      .eq("item_type", "step")
      .order("sort_order"),
  ])

  if (testersResult.error) {
    console.error("Failed to fetch testers:", testersResult.error.message)
  }
  if (checklistItemsResult.error) {
    console.error("Failed to fetch checklist items:", checklistItemsResult.error.message)
  }

  const testerList = testersResult.data || []
  const itemList = checklistItemsResult.data || []

  const testerIds = testerList.map((t) => t.id)
  const itemIds = itemList.map((ci) => ci.id)

  // Group B: responses + admin_reviews + review_history are independent — fetch in parallel
  let responses: {
    id: string
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }[] = []

  let adminReviews: {
    checklist_item_id: string
    tester_id: string
    finding_type: string | null
    resolution_status: string
    notes: string | null
  }[] = []

  let reviewHistory: {
    checklist_item_id: string
    tester_id: string
    field_changed: string
    old_value: string | null
    new_value: string | null
    changed_at: string
  }[] = []

  let attachmentsList: AttachmentData[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    // No .in("tester_id", ...) filter here: checklist_item_id is already scoped to
    // this project's items, which fully determines project membership on its own —
    // adding the tester_id list too only inflates the request URL (this is what
    // caused a HeadersOverflowError on the admin dashboard's equivalent query).
    const [responsesResult, adminReviewsResult, reviewHistoryResult] = await Promise.all([
      supabase
        .from("responses")
        .select("id, tester_id, checklist_item_id, status, comment")
        .in("checklist_item_id", itemIds),
      supabase
        .from("admin_reviews")
        .select("checklist_item_id, tester_id, finding_type, resolution_status, notes")
        .in("checklist_item_id", itemIds),
      supabase
        .from("admin_review_history")
        .select("checklist_item_id, tester_id, field_changed, old_value, new_value, changed_at")
        .in("checklist_item_id", itemIds)
        .order("changed_at", { ascending: false }),
    ])

    if (responsesResult.error) {
      console.error("Failed to fetch responses:", responsesResult.error.message)
    }
    if (adminReviewsResult.error) {
      console.error("Failed to fetch admin reviews:", adminReviewsResult.error.message)
    }
    if (reviewHistoryResult.error) {
      console.error("Failed to fetch review history:", reviewHistoryResult.error.message)
    }

    responses = responsesResult.data || []
    adminReviews = adminReviewsResult.data || []
    reviewHistory = reviewHistoryResult.data || []

    // Fetch attachments for all responses in this project
    const responseIds = responses.map((r) => r.id)
    if (responseIds.length > 0) {
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("attachments")
        .select("id, response_id, file_name, file_url, file_size, mime_type")
        .in("response_id", responseIds)

      if (attachmentsError) {
        console.error("Failed to fetch attachments:", attachmentsError.message)
      }
      attachmentsList = attachmentsData || []
    }
  }

  // Build history lookup: key = "testerId:checklistItemId" → HistoryEntry[]
  const historyMap = new Map<string, HistoryEntry[]>()
  reviewHistory.forEach((h) => {
    const key = `${h.tester_id}:${h.checklist_item_id}`
    if (!historyMap.has(key)) historyMap.set(key, [])
    historyMap.get(key)!.push({
      fieldChanged: h.field_changed,
      oldValue: h.old_value,
      newValue: h.new_value,
      changedAt: h.changed_at,
    })
  })

  // Build lookup maps
  const responseMap = new Map<string, (typeof responses)[0]>()
  responses.forEach((r) => {
    responseMap.set(`${r.tester_id}:${r.checklist_item_id}`, r)
  })

  // Build attachment lookup: response_id → AttachmentData[]
  const attachmentsByResponse = new Map<string, AttachmentData[]>()
  attachmentsList.forEach((a) => {
    const list = attachmentsByResponse.get(a.response_id) ?? []
    list.push(a)
    attachmentsByResponse.set(a.response_id, list)
  })

  const reviewMap = new Map<string, (typeof adminReviews)[0]>()
  adminReviews.forEach((r) => {
    reviewMap.set(`${r.tester_id}:${r.checklist_item_id}`, r)
  })

  // Build TesterSection[] — include only steps that are non-Pass or flagged For Retesting
  const testerSections: TesterSection[] = []

  for (const tester of testerList) {
    const steps: ReviewStep[] = []

    for (const item of itemList) {
      const response = responseMap.get(`${tester.id}:${item.id}`)
      const adminReview = reviewMap.get(`${tester.id}:${item.id}`)

      const testerStatus = response?.status ?? null

      // Include if tester status is non-Pass (Fail, Blocked, N/A) OR if admin flagged For Retesting
      const isNonPass = testerStatus !== null && testerStatus !== "Pass"
      const isForRetesting = adminReview?.resolution_status === "For Retesting"

      if (!isNonPass && !isForRetesting) continue

      const stepResponseId = response?.id ?? ""
      steps.push({
        checklistItemId: item.id,
        // Always non-null here because we filter item_type='step' above
        stepNumber: item.step_number ?? 0,
        path: item.path,
        actor: item.actor,
        action: item.action,
        testerStatus: testerStatus ?? "—",
        testerComment: response?.comment ?? null,
        responseId: stepResponseId,
        attachments: stepResponseId ? (attachmentsByResponse.get(stepResponseId) ?? []) : [],
        adminReview: adminReview
          ? {
              findingType: adminReview.finding_type,
              resolutionStatus: adminReview.resolution_status,
              notes: adminReview.notes,
            }
          : null,
        history: historyMap.get(`${tester.id}:${item.id}`) || [],
      })
    }

    if (steps.length > 0) {
      testerSections.push({ tester, steps })
    }
  }

  const reviewStats = testerSections.reduce(
    (stats, section) => {
      for (const step of section.steps) {
        stats.total += 1
        const resolutionStatus = step.adminReview?.resolutionStatus ?? "Not Yet Started"
        stats[resolutionStatus] = (stats[resolutionStatus] ?? 0) + 1
        if (step.testerStatus === "Fail") stats.fail += 1
        if (step.testerStatus === "Blocked" || step.testerStatus === "Up For Review") stats.review += 1
      }
      return stats
    },
    {
      total: 0,
      fail: 0,
      review: 0,
      "Not Yet Started": 0,
      "In Progress": 0,
      "For Retesting": 0,
      Done: 0,
    } as Record<string, number>
  )

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-brand-sage-darker transition-colors">
          UAT Admin
        </Link>
        <span>/</span>
        <Link
          href={`/admin/projects/${project.slug}`}
          className="hover:text-brand-sage-darker transition-colors"
        >
          {project.company_name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Review</span>
      </nav>

      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/admin/projects/${project.slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to UAT Checklist
        </Link>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Admin Review</p>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{project.company_name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Non-pass steps and items flagged for retesting, grouped by tester.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Queue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{reviewStats.total}</p>
              <p className="text-xs text-gray-500">{testerSections.length} tester groups</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-red-500">Failures</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{reviewStats.fail}</p>
              <p className="text-xs text-red-600">Reported as fail</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Review</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{reviewStats.review}</p>
              <p className="text-xs text-amber-700">Blocked or up for review</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{reviewStats.Done ?? 0}</p>
              <p className="text-xs text-green-700">Marked done</p>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
            <NotifyTestersButton slug={project.slug} testers={testerSections.map((s) => s.tester)} />
            <CompleteReviewButton slug={project.slug} testerSections={testerSections} />
            <PublishReviewButton slug={project.slug} />
            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center text-xs text-gray-500 sm:hidden lg:grid">
              <span className="flex items-center justify-center gap-1">
                <Clock3 className="h-3 w-3" />
                {reviewStats["Not Yet Started"] ?? 0} new
              </span>
              <span className="flex items-center justify-center gap-1">
                <Send className="h-3 w-3" />
                {reviewStats["For Retesting"] ?? 0} retest
              </span>
              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {reviewStats.Done ?? 0} done
              </span>
            </div>
          </div>
        </div>
      </div>

      {testerSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700">All steps passed</p>
          <p className="text-sm text-gray-400 mt-1">No non-pass steps or flagged items to review.</p>
        </div>
      ) : (
        <ReviewPanel testerSections={testerSections} projectSlug={project.slug} />
      )}
    </div>
  )
}
