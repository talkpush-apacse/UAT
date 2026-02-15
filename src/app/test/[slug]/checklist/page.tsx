import { notFound, redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import ChecklistView from "@/components/tester/checklist-view"

export default async function ChecklistPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { tester?: string }
}) {
  if (!searchParams.tester) {
    redirect(`/test/${params.slug}`)
  }

  const supabase = createServerSupabaseClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, test_scenario, talkpush_login_link")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // Verify tester exists and belongs to this project
  const { data: tester } = await supabase
    .from("testers")
    .select("id, name, project_id")
    .eq("id", searchParams.tester)
    .single()

  if (!tester || tester.project_id !== project.id) {
    redirect(`/test/${params.slug}`)
  }

  // Fetch checklist items
  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order")

  // Fetch existing responses
  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("tester_id", tester.id)

  // Fetch attachments for existing responses
  const responseIds = (responses || []).map((r) => r.id)
  let attachments: Array<{
    id: string
    response_id: string
    file_name: string
    file_url: string
    file_size: number
    mime_type: string
  }> = []

  if (responseIds.length > 0) {
    const { data } = await supabase
      .from("attachments")
      .select("id, response_id, file_name, file_url, file_size, mime_type")
      .in("response_id", responseIds)

    attachments = data || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ChecklistView
        project={project}
        tester={tester}
        checklistItems={checklistItems || []}
        responses={responses || []}
        attachments={attachments}
      />
    </div>
  )
}
