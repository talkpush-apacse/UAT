export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyShareToken } from "@/lib/utils/share-token"
import AnalyticsCharts from "@/components/admin/analytics-charts"

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

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, step_number, path, actor, action, crm_module")
    .eq("project_id", project.id)
    .order("sort_order")

  const { data: testers } = await supabase
    .from("testers")
    .select("id, name, email, test_completed")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  const testerIds = (testers || []).map((t) => t.id)
  const itemIds = (checklistItems || []).map((ci) => ci.id)

  let responses: {
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status, comment")
      .in("tester_id", testerIds)
      .in("checklist_item_id", itemIds)
    responses = data || []
  }

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
