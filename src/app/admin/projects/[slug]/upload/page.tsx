import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import UploadForm from "@/components/admin/upload-form"
import Link from "next/link"

export default async function UploadChecklistPage({
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

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-emerald-700 transition-colors">UAT Admin</Link>
        <span>/</span>
        <Link href={`/admin/projects/${params.slug}`} className="hover:text-emerald-700 transition-colors">
          {project.company_name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Upload Checklist</span>
      </nav>
      <UploadForm projectId={project.id} slug={project.slug} />
    </div>
  )
}
