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
import PreviewChecklistButton from "@/components/admin/preview-checklist-button"
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
  ChevronRight,
} from "lucide-react"
import MarkdownRenderer from "@/components/ui/markdown-renderer"

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

  let checklistItems: Array<{
    id: string
    step_number: number | null
    path: string | null
    actor: string
    action: string
    crm_module: string | null
    tip: string | null
    sort_order: number
    view_sample: string | null
    item_type: string
    header_label: string | null
  }> | null = null

  let signoffs: Array<{
    id: string
    project_id: string
    signoff_name: string
    signoff_date: string
    created_at: string | null
  }> | null = null
  let initialTesters: TesterProgress[] = []

  let needsTriageCount = 0

  try {
    // Group A: checklist_items + signoffs + testers are independent — fetch in parallel
    const [checklistResult, signoffResult, testersResult] = await Promise.all([
      supabase
        .from("checklist_items")
        .select("id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample, item_type, header_label")
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
      // Scope responses to only the *step* checklist items in this project —
      // phase headers can't have responses, so excluding them keeps the count
      // correct and makes the trigger never matter for normal flows.
      const itemIds = (checklistItems || [])
        .filter((ci) => ci.item_type === "step")
        .map((ci) => ci.id)

      const [{ data: responses }, { data: reviews }] = itemIds.length > 0
        ? await Promise.all([
            supabase
              .from("responses")
              .select("tester_id, checklist_item_id, status")
              .in("tester_id", testers.map((t) => t.id))
              .in("checklist_item_id", itemIds),
            supabase
              .from("admin_reviews")
              .select("tester_id, checklist_item_id, resolution_status")
              .in("tester_id", testers.map((t) => t.id))
              .in("checklist_item_id", itemIds),
          ])
        : [{ data: [] }, { data: [] }]

      // A finding "needs triage" when it's a Fail/Blocked response with no
      // review yet, or a review that hasn't been marked "Done" — mirrors how
      // review-panel.tsx and analytics-charts.tsx already treat unresolved reviews.
      const doneKeys = new Set(
        (reviews || [])
          .filter((r) => r.resolution_status === "Done")
          .map((r) => `${r.tester_id}:${r.checklist_item_id}`)
      )
      needsTriageCount = (responses || []).filter(
        (r) =>
          (r.status === "Fail" || r.status === "Blocked") &&
          !doneKeys.has(`${r.tester_id}:${r.checklist_item_id}`)
      ).length

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
          upForReview: testerResponses.filter((r) => r.status === "Up For Review").length,
        }
      })
    }
  } catch (err) {
    console.error("Project detail page data fetch error:", err)
    // Continue rendering with empty data rather than crashing
  }

  // itemCount = testable steps only (phase headers excluded from "X steps" labels)
  const itemCount =
    checklistItems?.filter((ci) => ci.item_type === "step").length || 0

  // Aggregate totals across all testers, for the header health ring
  const totalPass = initialTesters.reduce((sum, t) => sum + t.pass, 0)
  const totalFail = initialTesters.reduce((sum, t) => sum + t.fail, 0)
  const totalBlocked = initialTesters.reduce((sum, t) => sum + t.blocked, 0)
  const totalDecided = totalPass + totalFail + totalBlocked
  // "Healthy" = passing steps as a share of steps with a definitive Pass/Fail/Blocked
  // outcome — N/A and Up For Review are excluded since they aren't a health signal.
  const healthyPercent = totalDecided > 0 ? Math.round((totalPass / totalDecided) * 100) : 0
  const RING_RADIUS = 36
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

  const actionCards = [
    {
      href: `/admin/projects/${project.slug}/checklist`,
      icon: ListChecks,
      label: "Manage UAT Steps",
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
      badge: needsTriageCount > 0 ? needsTriageCount : null,
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
  ]

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-7 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
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
              project.test_scenario.length > 180 ? (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-sm text-gray-700 leading-relaxed list-none">
                    <span className="line-clamp-2">
                      {project.test_scenario.replace(/[#*_>`]/g, "").trim()}
                    </span>
                    <span className="text-brand-sage-darker font-semibold whitespace-nowrap ml-1 group-open:hidden">
                      Show more
                    </span>
                  </summary>
                  <MarkdownRenderer
                    content={project.test_scenario}
                    className="mt-3 prose-blockquote:not-italic prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-md"
                  />
                </details>
              ) : (
                <MarkdownRenderer
                  content={project.test_scenario}
                  className="mt-2 prose-blockquote:not-italic prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-md"
                />
              )
            )}
          </div>

          {totalDecided > 0 && (
            <div className="flex items-center gap-5 flex-shrink-0">
              <div className="relative w-[84px] h-[84px] flex-shrink-0">
                <svg viewBox="0 0 84 84" width={84} height={84}>
                  <circle cx={42} cy={42} r={RING_RADIUS} fill="none" stroke="hsl(139 25% 91%)" strokeWidth={8} />
                  <circle
                    cx={42}
                    cy={42}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="hsl(139 30% 40%)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - healthyPercent / 100)}
                    transform="rotate(-90 42 42)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[19px] font-bold font-nav">{healthyPercent}%</span>
                  <span className="text-[9px] text-gray-500">healthy</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-green-800">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  {totalPass} Pass
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  {totalFail} Fail
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  {totalBlocked} Blocked
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-5" />

        {/* Desktop: single row with 3-tier visual hierarchy */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <CopyLinkButton slug={project.slug} />
          <PreviewChecklistButton slug={project.slug} />
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <Link href={`/admin/projects/${project.slug}/edit`}>
            <Button size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit UAT Checklist
            </Button>
          </Link>
          <MoreActionsDropdown
            projectId={project.id}
            companyName={project.company_name}
            title={project.title}
            slug={project.slug}
          />
        </div>

        {/* Mobile: two stacked rows */}
        <div className="flex sm:hidden flex-col gap-2 w-full">
          <div className="flex gap-2">
            <CopyLinkButton slug={project.slug} className="flex-1 justify-center" />
            <PreviewChecklistButton slug={project.slug} className="flex-1 justify-center" />
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/projects/${project.slug}/edit`} className="flex-1">
              <Button size="sm" className="w-full">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit UAT Checklist
              </Button>
            </Link>
            <MoreActionsDropdown
              projectId={project.id}
              companyName={project.company_name}
              title={project.title}
              slug={project.slug}
            />
          </div>
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

      {/* Action nav cards — clearly clickable tiles */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {actionCards.map((card) => (
          <Link key={card.href} href={card.href} className="block">
            <div className="group relative flex flex-col items-center justify-center bg-white rounded-xl border-t-4 border-t-brand-sage-darker border border-gray-200 shadow hover:shadow-lg hover:border-brand-sage hover:bg-brand-sage-lightest transition-all duration-200 cursor-pointer px-4 py-5 text-center">
              {card.badge != null && (
                <span className="absolute top-2.5 left-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {card.badge}
                </span>
              )}
              {/* Arrow affordance — always faintly visible, brightens on hover */}
              <ChevronRight className="absolute top-3 right-3 h-4 w-4 text-gray-300 group-hover:text-brand-sage-darker transition-colors" />
              {/* Icon with colored bg bubble */}
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 group-hover:bg-brand-sage-lighter transition-colors">
                <card.icon className="h-5 w-5 text-gray-500 group-hover:text-brand-sage-darker transition-colors" />
              </div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-sage-darker leading-tight transition-colors">{card.label}</p>
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <Separator className="mb-8" />

      {itemCount > 0 && (
        <div className="mb-8">
          {/* P3 — Section header at 16px/600 */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">UAT Steps Summary</h2>
            <a href={`/admin/projects/${project.slug}/export-steps`}>
              <Button size="sm" className="bg-brand-sage-darker hover:opacity-90 text-white">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Steps as Spreadsheet
              </Button>
            </a>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Path</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tester Perspective</th>
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

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Tester Progress</h2>
      </div>
      <LiveProgressTable
        slug={project.slug}
        totalItems={itemCount}
        initialTesters={initialTesters}
      />
    </div>
  )
}
