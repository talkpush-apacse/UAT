import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import ChecklistEditor from "@/components/admin/checklist-editor"
import Link from "next/link"

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
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order")

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
      <ChecklistEditor
        items={items || []}
        projectId={project.id}
        slug={project.slug}
      />
    </div>
  )
}
