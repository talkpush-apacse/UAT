export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import SignoffForm from "@/components/admin/signoff-form"
import Link from "next/link"

export default async function SignoffPage({
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

  const { data: signoffs } = await supabase
    .from("signoffs")
    .select("id, project_id, signoff_name, signoff_date, created_at")
    .eq("project_id", project.id)
    .order("signoff_date", { ascending: false })

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-brand-sage-darker transition-colors">UAT Admin</Link>
        <span>/</span>
        <Link href={`/admin/projects/${params.slug}`} className="hover:text-brand-sage-darker transition-colors">
          {project.company_name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Sign Off</span>
      </nav>
      <SignoffForm
        projectId={project.id}
        slug={project.slug}
        signoffs={signoffs || []}
      />
    </div>
  )
}
