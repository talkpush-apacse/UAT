export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LiveProgressTable from "@/components/admin/live-progress-table"
import type { TesterProgress } from "@/components/admin/live-progress-table"
import CopyLinkButton from "@/components/admin/copy-link-button"
import CopyAnalyticsLinkButton from "@/components/admin/copy-analytics-link-button"
import DeleteProjectButton from "@/components/admin/delete-project-button"
import DuplicateProjectButton from "@/components/admin/duplicate-project-button"
import {
  ArrowLeft,
  Pencil,
  Upload,
  ListChecks,
  BarChart3,
  FileCheck,
  Download,
  CheckCircle2,
} from "lucide-react"

const ACTOR_STYLES: Record<string, string> = {
  Candidate: "bg-sky-50 text-sky-800 border-sky-200",
  Talkpush: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Recruiter: "bg-violet-50 text-violet-800 border-violet-200",
}

const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, test_scenario, talkpush_login_link, created_at")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checklistItems: any[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let signoffs: any[] | null = null
  let initialTesters: TesterProgress[] = []

  try {
    const checklistResult = await supabase
      .from("checklist_items")
      .select("id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample")
      .eq("project_id", project.id)
      .order("sort_order")
    checklistItems = checklistResult.data

    const signoffResult = await supabase
      .from("signoffs")
      .select("id, project_id, signoff_name, signoff_date, created_at")
      .eq("project_id", project.id)
      .order("signoff_date", { ascending: false })
    signoffs = signoffResult.data

    // Query testers and their responses server-side for initial render
    const { data: testers } = await supabase
      .from("testers")
      .select("id, name, email, mobile")
      .eq("project_id", project.id)

    if (testers && testers.length > 0) {
      // Scope responses to only checklist items belonging to this project
      // so that testers who participated in other projects aren't double-counted.
      const itemIds = (checklistItems || []).map((ci: { id: string }) => ci.id)

      const { data: responses } = itemIds.length > 0
        ? await supabase
            .from("responses")
            .select("tester_id, status")
            .in("tester_id", testers.map((t) => t.id))
            .in("checklist_item_id", itemIds)
        : { data: [] }

      initialTesters = testers.map((tester) => {
        const testerResponses = (responses || []).filter(
          (r) => r.tester_id === tester.id && r.status !== null
        )
        return {
          id: tester.id,
          name: tester.name,
          email: tester.email,
          mobile: tester.mobile,
          total: testerResponses.length,
          completed: testerResponses.length,
          pass: testerResponses.filter((r) => r.status === "Pass").length,
          fail: testerResponses.filter((r) => r.status === "Fail").length,
          na: testerResponses.filter((r) => r.status === "N/A").length,
          blocked: testerResponses.filter((r) => r.status === "Blocked").length,
        }
      })
    }
  } catch (err) {
    console.error("Project detail page data fetch error:", err)
    // Continue rendering with empty data rather than crashing
  }

  const itemCount = checklistItems?.length || 0

  const actionCards = [
    {
      href: `/admin/projects/${project.slug}/checklist`,
      icon: ListChecks,
      label: "Manage Steps",
      sub: "Add/Edit/Reorder Steps",
    },
    {
      href: `/admin/projects/${project.slug}/upload`,
      icon: Upload,
      label: "Upload UAT (User Acceptance Testing) Sheet",
      sub: `${itemCount} steps`,
    },
    {
      href: `/admin/projects/${project.slug}/analytics`,
      icon: BarChart3,
      label: "Analytics",
      sub: "Charts & Filters",
    },
    {
      href: `/admin/projects/${project.slug}/signoff`,
      icon: FileCheck,
      label: "Sign Off",
      sub: `${signoffs?.length || 0} sign-offs`,
    },
  ]

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to UAT Checklists
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{project.company_name}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">Tester URL: /test/{project.slug}</p>
          {project.test_scenario && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{project.test_scenario}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
          <CopyLinkButton slug={project.slug} />
          <CopyAnalyticsLinkButton slug={project.slug} />
          <Link href={`/admin/projects/${project.slug}/edit`}>
            <Button variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Project
            </Button>
          </Link>
          <DuplicateProjectButton projectId={project.id} slug={project.slug} />
          <DeleteProjectButton projectId={project.id} companyName={project.company_name} />
        </div>
      </div>

      {(signoffs && signoffs.length > 0) && (
        <div className="mb-6 p-4 bg-green-50/50 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800">UAT Sign-Off Complete</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {signoffs.map((s) => (
              <p key={s.id}>{s.signoff_name} — {new Date(s.signoff_date).toLocaleDateString()}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {actionCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 cursor-pointer p-5 text-center">
              <card.icon className="h-5 w-5 text-gray-400 group-hover:text-emerald-700 mx-auto mb-2 transition-colors" />
              <p className="text-sm font-medium text-gray-700">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex gap-2 mb-8">
        <a href={`/admin/projects/${project.slug}/export`}>
          <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Results (.xlsx)
          </Button>
        </a>
      </div>

      <Separator className="mb-8" />

      {itemCount > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Checklist Summary</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Path</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Module</th>
                </tr>
              </thead>
              <tbody>
                {checklistItems?.map((item) => (
                  <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {item.step_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.path && (
                        <Badge variant="outline" className={`text-xs ${PATH_STYLES[item.path] || ""}`}>
                          {item.path}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${ACTOR_STYLES[item.actor] || ""}`}>
                        {item.actor}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 leading-relaxed">{item.action}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.crm_module || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Tester Progress</h2>
      <LiveProgressTable
        slug={project.slug}
        totalItems={itemCount}
        initialTesters={initialTesters}
      />
    </div>
  )
}
