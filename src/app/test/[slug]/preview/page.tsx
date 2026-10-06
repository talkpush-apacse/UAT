import Link from "next/link"
import { notFound } from "next/navigation"
import { UserPlus } from "lucide-react"
import { createAnonSupabaseClient } from "@/lib/supabase/server"
import ChecklistView from "@/components/tester/checklist-view"

export default async function ChecklistPreviewPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAnonSupabaseClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, test_scenario, talkpush_login_link, wizard_mode, client:clients(logo_url)")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, step_number, path, actor, action, view_sample, crm_module, tip, sort_order, item_type, header_label")
    .eq("project_id", project.id)
    .order("sort_order")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-primary bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-primary">UAT steps preview</p>
            <p className="text-sm font-medium text-gray-700">
              Review the steps before registering. Your responses are saved once you start testing.
            </p>
          </div>
          <Link
            href={`/test/${project.slug}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <UserPlus className="h-4 w-4" />
            Register
          </Link>
        </div>
      </div>

      <ChecklistView
        project={project}
        tester={{ id: "preview", name: "Preview" }}
        checklistItems={checklistItems || []}
        responses={[]}
        attachments={[]}
        testCompleted={null}
        previewMode
      />
    </div>
  )
}
