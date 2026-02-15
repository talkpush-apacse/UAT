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
    .select("*")
    .eq("project_id", project.id)
    .order("signoff_date", { ascending: false })

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
      <SignoffForm
        projectId={project.id}
        slug={project.slug}
        signoffs={signoffs || []}
      />
    </div>
  )
}
