export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import ReviewPanel from "@/components/admin/review-panel"
import PublishReviewButton from "@/components/admin/publish-review-button"

export type ReviewStep = {
  checklistItemId: string
  stepNumber: number
  path: string | null
  actor: string
  action: string
  testerStatus: string
  testerComment: string | null
  responseId: string
  adminReview: {
    behaviorType: string | null
    resolutionStatus: string
    notes: string | null
  } | null
}

export type TesterSection = {
  tester: { id: string; name: string; email: string }
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

  const { data: testers } = await supabase
    .from("testers")
    .select("id, name, email")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, step_number, path, actor, action, crm_module, sort_order")
    .eq("project_id", project.id)
    .order("sort_order")

  const testerList = testers || []
  const itemList = checklistItems || []

  const testerIds = testerList.map((t) => t.id)
  const itemIds = itemList.map((ci) => ci.id)

  // Fetch all responses for this project's testers scoped to this project's items
  let responses: {
    id: string
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("id, tester_id, checklist_item_id, status, comment")
      .in("tester_id", testerIds)
      .in("checklist_item_id", itemIds)
    responses = data || []
  }

  // Fetch all admin reviews for these testers, scoped to this project's items
  let adminReviews: {
    checklist_item_id: string
    tester_id: string
    behavior_type: string | null
    resolution_status: string
    notes: string | null
  }[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    const { data } = await supabase
      .from("admin_reviews")
      .select("checklist_item_id, tester_id, behavior_type, resolution_status, notes")
      .in("tester_id", testerIds)
      .in("checklist_item_id", itemIds) // scope to this project's items only
    adminReviews = data || []
  }

  // Build lookup maps
  const responseMap = new Map<string, (typeof responses)[0]>()
  responses.forEach((r) => {
    responseMap.set(`${r.tester_id}:${r.checklist_item_id}`, r)
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
      const isForRetesting = adminReview?.behavior_type === "For Retesting"

      if (!isNonPass && !isForRetesting) continue

      steps.push({
        checklistItemId: item.id,
        stepNumber: item.step_number,
        path: item.path,
        actor: item.actor,
        action: item.action,
        testerStatus: testerStatus ?? "—",
        testerComment: response?.comment ?? null,
        responseId: response?.id ?? "",
        adminReview: adminReview
          ? {
              behaviorType: adminReview.behavior_type,
              resolutionStatus: adminReview.resolution_status,
              notes: adminReview.notes,
            }
          : null,
      })
    }

    if (steps.length > 0) {
      testerSections.push({ tester, steps })
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-emerald-700 transition-colors">
          UAT Admin
        </Link>
        <span>/</span>
        <Link
          href={`/admin/projects/${project.slug}`}
          className="hover:text-emerald-700 transition-colors"
        >
          {project.company_name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Review</span>
      </nav>

      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/admin/projects/${project.slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Admin Review</p>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{project.company_name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Non-pass steps and items flagged for retesting, grouped by tester.
          </p>
        </div>
        <div className="flex-shrink-0 pt-1">
          <PublishReviewButton slug={project.slug} />
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
