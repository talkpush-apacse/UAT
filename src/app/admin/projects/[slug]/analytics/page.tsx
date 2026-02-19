export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import AnalyticsCharts from "@/components/admin/analytics-charts"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AnalyticsPage({
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

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, step_number, path, actor, action, crm_module")
    .eq("project_id", project.id)
    .order("sort_order")

  // Include email for the report sections
  const { data: testers } = await supabase
    .from("testers")
    .select("id, name, email")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  const testerIds = (testers || []).map((t) => t.id)
  const itemIds = (checklistItems || []).map((ci) => ci.id)

  let responses: { tester_id: string; checklist_item_id: string; status: string | null }[] = []

  if (testerIds.length > 0 && itemIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status")
      .in("tester_id", testerIds)
      .in("checklist_item_id", itemIds) // scope to this project's items only

    responses = data || []
  }

  // Fetch admin reviews for all testers in this project
  let adminReviews: {
    checklist_item_id: string
    tester_id: string
    behavior_type: string | null
    resolution_status: string
    notes: string | null
  }[] = []

  if (testerIds.length > 0) {
    const { data } = await supabase
      .from("admin_reviews")
      .select("checklist_item_id, tester_id, behavior_type, resolution_status, notes")
      .in("tester_id", testerIds)

    adminReviews = data || []
  }

  const crmModules = Array.from(
    new Set(
      (checklistItems || [])
        .map((item) => item.crm_module)
        .filter((m): m is string => m !== null && m !== "")
    )
  ).sort()

  const actors = Array.from(
    new Set((checklistItems || []).map((item) => item.actor))
  ).sort()

  return (
    <div>
      <Link
        href={`/admin/projects/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Project
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        Analytics — {project.company_name}
      </h1>
      <AnalyticsCharts
        checklistItems={checklistItems || []}
        testers={testers || []}
        responses={responses}
        adminReviews={adminReviews}
        crmModules={crmModules}
        actors={actors}
      />
    </div>
  )
}
