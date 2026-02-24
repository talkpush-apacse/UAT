import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import TesterResultsView from "@/components/tester/tester-results-view"

export default async function TesterResultsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { tester?: string }
}) {
  if (!searchParams.tester) {
    redirect(`/test/${params.slug}`)
  }

  const supabase = createAdminClient()

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // Verify tester exists and belongs to this project
  const { data: tester } = await supabase
    .from("testers")
    .select("id, name, project_id, test_completed")
    .eq("id", searchParams.tester)
    .single()

  if (!tester || tester.project_id !== project.id) {
    redirect(`/test/${params.slug}`)
  }

  // Fetch checklist items
  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, step_number, actor, action, sort_order")
    .eq("project_id", project.id)
    .order("sort_order")

  const items = checklistItems || []
  const itemIds = items.map((ci) => ci.id)

  // Fetch this tester's responses scoped to this project's items
  let responses: {
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }[] = []

  if (itemIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status, comment")
      .eq("tester_id", tester.id)
      .in("checklist_item_id", itemIds)
    responses = data || []
  }

  // Fetch admin reviews for this tester scoped to this project's items
  let adminReviews: {
    checklist_item_id: string
    tester_id: string
    resolution_status: string
    notes: string | null
  }[] = []

  if (itemIds.length > 0) {
    const { data } = await supabase
      .from("admin_reviews")
      .select("checklist_item_id, tester_id, resolution_status, notes")
      .eq("tester_id", tester.id)
      .in("checklist_item_id", itemIds)
    adminReviews = data || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TesterResultsView
        project={{ slug: project.slug, companyName: project.company_name }}
        testerName={tester.name}
        testerId={tester.id}
        checklistItems={items}
        responses={responses}
        adminReviews={adminReviews}
      />
    </div>
  )
}
