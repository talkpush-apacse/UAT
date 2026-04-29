import Link from "next/link"
import { notFound } from "next/navigation"
import { ClipboardList, UserPlus } from "lucide-react"
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
    .select("id, slug, company_name, test_scenario, talkpush_login_link, wizard_mode")
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
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-sage-lightest text-brand-sage-darker">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Checklist Preview</p>
              <p className="text-sm text-gray-500">
                Review the steps before registering. Your responses will be saved after you start testing.
              </p>
            </div>
          </div>
          <Link
            href={`/test/${project.slug}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
