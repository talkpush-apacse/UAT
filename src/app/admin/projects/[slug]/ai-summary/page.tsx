export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { ArrowLeft } from "lucide-react"
import AISummaryPanel from "@/components/admin/ai-summary-panel"

export default async function AISummaryPage({
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
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-emerald-700 transition-colors">
          UAT Admin
        </Link>
        <span>/</span>
        <Link
          href={`/admin/projects/${project.slug}`}
          className="hover:text-emerald-700 transition-colors"
        >
          {project.company_name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">AI Summary</span>
      </nav>

      <Link
        href={`/admin/projects/${project.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {project.company_name}
      </Link>

      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Admin Tool</p>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">AI UAT Summary</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate an LLM-powered executive summary of UAT results for{" "}
          <span className="font-medium text-gray-700">{project.company_name}</span>.
          This page is admin-only and not visible to clients.
        </p>
      </div>

      <AISummaryPanel slug={project.slug} />
    </div>
  )
}
