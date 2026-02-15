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
      <div className="mb-6">
        <Link
          href={`/admin/projects/${params.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Project
        </Link>
      </div>
      <UploadForm projectId={project.id} slug={project.slug} />
    </div>
  )
}
