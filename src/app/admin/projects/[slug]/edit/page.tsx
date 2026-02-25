export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import EditProjectForm from "@/components/admin/edit-project-form"
import Link from "next/link"

export default async function EditProjectPage({
  params,
}: {
  params: { slug: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, title, test_scenario, talkpush_login_link")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/projects/${params.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Project
        </Link>
      </div>
      <EditProjectForm project={project} />
    </div>
  )
}
