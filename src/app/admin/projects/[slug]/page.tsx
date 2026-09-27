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
  AlertTriangle,
  Share2,
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

      // No .in("tester_id", ...) filter here: checklist_item_id is already scoped to
      // this project's items, which fully determines project membership on its own —
      // adding the tester_id list too only inflates the request URL (this is what
      // caused a HeadersOverflowError on the admin dashboard's equivalent query).
      const [{ data: responses }, { data: reviews }] = itemIds.length > 0
        ? await Promise.all([
            supabase
              .from("responses")
              .select("tester_id, checklist_item_id, status")
              .in("checklist_item_id", itemIds),
            supabase
              .from("admin_reviews")
              .select("tester_id, checklist_item_id, resolution_status")
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
          (r.status === "Fail" || r.status === "Blocked" || r.status === "Up For Review") &&
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
  const totalForReview = initialTesters.reduce((sum, t) => sum + t.upForReview, 0)
  const totalCompletedResponses = initialTesters.reduce((sum, t) => sum + t.completed, 0)
  const expectedResponses = itemCount * initialTesters.length
  const completionPercent = expectedResponses > 0
    ? Math.round((totalCompletedResponses / expectedResponses) * 100)
    : 0
  const totalDecided = totalPass + totalFail + totalBlocked
  // "Healthy" = passing steps as a share of steps with a definitive Pass/Fail/Blocked
  // outcome — N/A and Up For Review are excluded since they aren't a health signal.
  const healthyPercent = totalDecided > 0 ? Math.round((totalPass / totalDecided) * 100) : 0

  const readinessChecks = [
    { label: "UAT steps exist", complete: itemCount > 0, fixHref: `/admin/projects/${project.slug}/checklist` },
    { label: "At least one tester registered", complete: initialTesters.length > 0, fixHref: `/test/${project.slug}` },
    { label: "No open review items", complete: needsTriageCount === 0, fixHref: `/admin/projects/${project.slug}/review` },
    { label: "Client sign-off recorded", complete: (signoffs?.length ?? 0) > 0, fixHref: `/admin/projects/${project.slug}/signoff` },
  ]

  const primaryAction =
    itemCount === 0
      ? { href: `/admin/projects/${project.slug}/checklist`, label: "Add UAT Steps", icon: ListChecks }
      : initialTesters.length === 0
        ? { href: `/test/${project.slug}`, label: "Open Tester Link", icon: Share2 }
        : needsTriageCount > 0
          ? { href: `/admin/projects/${project.slug}/review`, label: "Review Findings", icon: ClipboardCheck }
          : (signoffs?.length ?? 0) === 0
            ? { href: `/admin/projects/${project.slug}/signoff`, label: "Record Sign-Off", icon: FileCheck }
            : { href: `/share/analytics/${project.slug}/${shareToken}`, label: "Open Client Report", icon: BarChart3 }

  const lifecycleSteps = [
    {
      href: `/admin/projects/${project.slug}/checklist`,
      icon: ListChecks,
      label: "Setup",
      sub: itemCount > 0 ? `${itemCount} steps ready` : "Add UAT steps",
      complete: itemCount > 0,
    },
    {
      href: `/test/${project.slug}`,
      icon: Share2,
      label: "Test",
      sub: initialTesters.length > 0 ? `${initialTesters.length} testers` : "Share tester link",
      complete: initialTesters.length > 0,
    },
    {
      href: `/admin/projects/${project.slug}/review`,
      icon: ClipboardCheck,
      label: "Review",
      sub: needsTriageCount > 0 ? `${needsTriageCount} open items` : "No open items",
      complete: needsTriageCount === 0 && initialTesters.length > 0,
      attention: needsTriageCount > 0,
    },
    {
      href: `/share/analytics/${project.slug}/${shareToken}`,
      icon: BarChart3,
      label: "Report",
      sub: completionPercent > 0 ? `${completionPercent}% complete` : "No tester data",
      complete: completionPercent > 0,
    },
    {
      href: `/admin/projects/${project.slug}/signoff`,
      icon: FileCheck,
      label: "Sign Off",
      sub: `${signoffs?.length || 0} sign-offs`,
      complete: (signoffs?.length ?? 0) > 0,
    },
  ]
  const PrimaryActionIcon = primaryAction.icon

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

          {(expectedResponses > 0 || totalDecided > 0) && (
            <div className="grid min-w-[260px] gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:w-[340px]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{completionPercent}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Complete</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{healthyPercent}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Pass Rate</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${needsTriageCount > 0 ? "text-red-700" : "text-gray-900"}`}>
                    {needsTriageCount}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Open</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="font-medium text-green-800">{totalPass} pass</span>
                <span className="font-medium text-red-700">{totalFail} fail</span>
                <span className="font-medium text-amber-800">{totalBlocked + totalForReview} review</span>
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
          <Link href={primaryAction.href}>
            <Button size="sm" variant={needsTriageCount > 0 ? "cta" : "default"}>
              <PrimaryActionIcon className="h-3.5 w-3.5 mr-1.5" />
              {primaryAction.label}
            </Button>
          </Link>
          <Link href={`/admin/projects/${project.slug}/edit`}>
            <Button size="sm" variant="outline">
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
            <Link href={primaryAction.href} className="flex-1">
              <Button size="sm" className="w-full" variant={needsTriageCount > 0 ? "cta" : "default"}>
                <PrimaryActionIcon className="h-3.5 w-3.5 mr-1.5" />
                {primaryAction.label}
              </Button>
            </Link>
            <Link href={`/admin/projects/${project.slug}/edit`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
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

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">UAT Lifecycle</h2>
              <p className="text-sm text-gray-500">Follow the work from setup through client sign-off.</p>
            </div>
            <Link href={`/admin/projects/${project.slug}/upload`}>
              <Button variant="outline" size="sm">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Sheet
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {lifecycleSteps.map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className={`group rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker ${
                  step.attention
                    ? "border-red-200 bg-red-50 hover:bg-red-100"
                    : step.complete
                      ? "border-green-200 bg-green-50/60 hover:bg-green-50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <step.icon className={`h-4 w-4 ${step.attention ? "text-red-600" : step.complete ? "text-green-700" : "text-gray-500"}`} />
                  {step.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : step.attention ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                <p className="mt-1 text-xs text-gray-500">{step.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Readiness</h2>
          <div className="mt-4 space-y-3">
            {readinessChecks.map((check) => (
              <div key={check.label} className="flex items-start gap-2">
                {check.complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${check.complete ? "text-gray-800" : "text-amber-900"}`}>
                    {check.label}
                  </p>
                  {!check.complete && (
                    <Link href={check.fixHref} className="text-xs font-medium text-brand-sage-darker hover:underline">
                      Fix now
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
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
