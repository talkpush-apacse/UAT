export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import ChecklistEditor from "@/components/admin/checklist-editor"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ManageChecklistPage({
  params,
}: {
  params: { slug: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, project_id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample")
    .eq("project_id", project.id)
    .order("sort_order")

  return (
    <div>
      <Link
        href={`/admin/projects/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Project
      </Link>
      <ChecklistEditor
        items={items || []}
        projectId={project.id}
        slug={project.slug}
      />
    </div>
  )
}
