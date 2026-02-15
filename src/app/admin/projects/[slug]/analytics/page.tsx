import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import AnalyticsCharts from "@/components/admin/analytics-charts"
import Link from "next/link"

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

  const { data: testers } = await supabase
    .from("testers")
    .select("id, name")
    .eq("project_id", project.id)

  const testerIds = (testers || []).map((t) => t.id)
  let responses: { tester_id: string; checklist_item_id: string; status: string | null }[] = []

  if (testerIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status")
      .in("tester_id", testerIds)

    responses = data || []
  }

  // Extract unique CRM modules
  const crmModules = Array.from(
    new Set(
      (checklistItems || [])
        .map((item) => item.crm_module)
        .filter((m): m is string => m !== null && m !== "")
    )
  ).sort()

  // Extract unique actors
  const actors = Array.from(
    new Set((checklistItems || []).map((item) => item.actor))
  ).sort()

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/projects/${params.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Project
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">
        Analytics — {project.company_name}
      </h1>
      <AnalyticsCharts
        checklistItems={checklistItems || []}
        testers={testers || []}
        responses={responses}
        crmModules={crmModules}
        actors={actors}
      />
    </div>
  )
}
