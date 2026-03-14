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
import { generateShareToken } from "@/lib/utils/share-token"
import MoreActionsDropdown from "@/components/admin/more-actions-dropdown"
import {
  Pencil,
  Upload,
  ListChecks,
  BarChart3,
  FileCheck,
  Download,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react"

import { ACTOR_COLORS as ACTOR_STYLES } from "@/lib/constants"

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
    .select("id, slug, company_name, title, test_scenario, talkpush_login_link, created_at")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  const shareToken = await generateShareToken(project.slug)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checklistItems: any[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let signoffs: any[] | null = null
  let initialTesters: TesterProgress[] = []

  try {
    // Group A: checklist_items + signoffs + testers are independent — fetch in parallel
    const [checklistResult, signoffResult, testersResult] = await Promise.all([
      supabase
        .from("checklist_items")
        .select("id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample")
        .eq("project_id", project.id)
        .order("sort_order"),
      supabase
        .from("signoffs")
        .select("id, project_id, signoff_name, signoff_date, created_at")
        .eq("project_id", project.id)
        .order("signoff_date", { ascending: false }),
      supabase
        .from("testers")
        .select("id, name, email, mobile")
        .eq("project_id", project.id),
    ])

    if (checklistResult.error) {
      console.error("Failed to fetch checklist items:", checklistResult.error.message)
    }
    if (signoffResult.error) {
      console.error("Failed to fetch signoffs:", signoffResult.error.message)
    }
    if (testersResult.error) {
      console.error("Failed to fetch testers:", testersResult.error.message)
    }

    checklistItems = checklistResult.data
    signoffs = signoffResult.data
    const testers = testersResult.data

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
      label: "Upload UAT Sheet",
      sub: `${itemCount} steps`,
    },
    {
      href: `/admin/projects/${project.slug}/review`,
      icon: ClipboardCheck,
      label: "Review",
      sub: "Triage findings",
    },
    {
      href: `/share/analytics/${project.slug}/${shareToken}`,
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
    {
      href: `/admin/projects/${project.slug}/ai-summary`,
      icon: Sparkles,
      label: "AI Summary",
      sub: "LLM-powered report",
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          {/* P3 — Client name as meta overline */}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
            {project.company_name}
          </p>
          {/* P3 — Page title at 28px/700 */}
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">
            {project.title || project.company_name}
          </h1>
          {/* P3 — Tester URL as monospace meta */}
          <p className="text-xs text-gray-400 font-mono">
            <span className="text-gray-500 not-italic">Tester URL:</span>{" "}
            <a
              href={`/test/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-sage-darker underline hover:text-primary"
            >
              /test/{project.slug}
            </a>
          </p>
          {project.test_scenario && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{project.test_scenario}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <CopyLinkButton slug={project.slug} />
          <CopyAnalyticsLinkButton slug={project.slug} />
          {/* Visual separator between share actions and management actions */}
          <div className="hidden sm:block w-px h-6 bg-gray-200" />
          <Link href={`/admin/projects/${project.slug}/edit`}>
            <Button variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Project
            </Button>
          </Link>
          <MoreActionsDropdown projectId={project.id} slug={project.slug} companyName={project.company_name} />
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

      {/* P2 — Action cards with top-border accent, hover lift, right-arrow affordance */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        {actionCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-sage-lighter hover:bg-brand-sage-lightest transition-all duration-200 cursor-pointer p-5 text-center border-t-4 border-t-brand-sage-darker">
              {/* Right-arrow affordance — appears on hover */}
              <ChevronRight className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-gray-300 group-hover:text-brand-sage-darker transition-colors" />
              <card.icon className="h-5 w-5 text-gray-400 group-hover:text-brand-sage-darker mx-auto mb-2 transition-colors" />
              <p className="text-[15px] font-semibold text-gray-800 leading-tight">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <Separator className="mb-8" />

      {itemCount > 0 && (
        <div className="mb-8">
          {/* P3 — Section header at 16px/600 */}
          <h2 className="text-base font-semibold text-gray-900 mb-3">Checklist Summary</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Path</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                  {/* P3 — Module column: left separator + medium gray/500 weight */}
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-l border-gray-200">Module</th>
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
                    {/* P3 — Module: medium gray, 500 weight, left border separator */}
                    <td className="px-4 py-3 text-sm font-medium text-[#6B7280] border-l border-gray-200">{item.crm_module || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P3 — Tester Progress section: Export Steps button moved here (right-aligned) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Tester Progress</h2>
        <a href={`/admin/projects/${project.slug}/export-steps`}>
          <Button variant="outline" size="sm" className="text-brand-sage-darker border-brand-sage-lighter hover:bg-brand-sage-lightest">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Steps (.xlsx)
          </Button>
        </a>
      </div>
      <LiveProgressTable
        slug={project.slug}
        totalItems={itemCount}
        initialTesters={initialTesters}
      />
    </div>
  )
}
