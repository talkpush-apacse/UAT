export const dynamic = "force-dynamic"

import nextDynamic from "next/dynamic"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyShareToken } from "@/lib/utils/share-token"

// Lazy-load AnalyticsCharts (includes Recharts, html2canvas, jspdf, exceljs)
// to reduce the initial server-rendered bundle size.
const AnalyticsCharts = nextDynamic(
  () => import("@/components/admin/analytics-charts"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-40 flex flex-col items-center justify-center"
            >
              <div className="h-12 w-12 bg-muted animate-pulse rounded-full mb-3" />
              <div className="h-8 w-14 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="h-5 w-44 bg-muted animate-pulse rounded mb-4" />
          <div className="h-[280px] bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="h-5 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    ),
  }
)

export default async function PublicAnalyticsPage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  const isValid = await verifyShareToken(params.slug, params.token)
  if (!isValid) notFound()

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // Group A: checklist_items + testers are independent — fetch in parallel
  const [checklistItemsResult, testersResult] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, step_number, path, actor, action, crm_module")
      .eq("project_id", project.id)
      .order("sort_order"),
    supabase
      .from("testers")
      .select("id, name, email, test_completed")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
  ])

  if (checklistItemsResult.error) {
    console.error("Failed to fetch checklist items:", checklistItemsResult.error.message)
  }
  if (testersResult.error) {
    console.error("Failed to fetch testers:", testersResult.error.message)
  }

  const checklistItems = checklistItemsResult.data
  const testers = testersResult.data

  const testerIds = (testers || []).map((t) => t.id)
  const itemIds = (checklistItems || []).map((ci) => ci.id)

  // Group B: responses + admin_reviews are independent — fetch in parallel
  let responses: {
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }[] = []

  let adminReviews: {
    checklist_item_id: string
    tester_id: string
    behavior_type: string | null
    resolution_status: string
    notes: string | null
  }[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    const [responsesResult, adminReviewsResult] = await Promise.all([
      supabase
        .from("responses")
        .select("tester_id, checklist_item_id, status, comment")
        .in("tester_id", testerIds)
        .in("checklist_item_id", itemIds),
      supabase
        .from("admin_reviews")
        .select("checklist_item_id, tester_id, behavior_type, resolution_status, notes")
        .in("tester_id", testerIds)
        .in("checklist_item_id", itemIds),
    ])

    if (responsesResult.error) {
      console.error("Failed to fetch responses:", responsesResult.error.message)
    }
    if (adminReviewsResult.error) {
      console.error("Failed to fetch admin reviews:", adminReviewsResult.error.message)
    }

    responses = responsesResult.data || []
    adminReviews = adminReviewsResult.data || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">UAT Analytics Report</p>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{project.company_name}</h1>
        </div>
        <AnalyticsCharts
          checklistItems={checklistItems || []}
          testers={testers || []}
          responses={responses}
          adminReviews={adminReviews}
        />

      </div>
    </div>
  )
}
