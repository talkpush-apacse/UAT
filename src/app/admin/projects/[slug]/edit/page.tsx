export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import EditProjectForm from "@/components/admin/edit-project-form"
import NotificationRecipientsCard from "@/components/admin/notification-recipients-card"
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
    .select("id, slug, company_name, title, test_scenario, talkpush_login_link, country, wizard_mode")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  const { data: recipients } = await supabase
    .from("project_notification_recipients")
    .select("email")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/projects/${params.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to UAT Checklist
        </Link>
      </div>
      <EditProjectForm project={project} />
      <NotificationRecipientsCard
        projectId={project.id}
        slug={project.slug}
        initialEmails={(recipients ?? []).map((r) => r.email)}
      />
    </div>
  )
}
