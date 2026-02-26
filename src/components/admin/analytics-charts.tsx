"use client"

import { useState, useMemo, useRef } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  CheckCircle2,
  Play,
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  crm_module: string | null
}

interface Tester {
  id: string
  name: string
  email: string
  test_completed?: string | null
}

interface Response {
  tester_id: string
  checklist_item_id: string
  status: string | null
  comment: string | null
}

interface AdminReview {
  checklist_item_id: string
  tester_id: string
  behavior_type: string | null
  resolution_status: string
  notes: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  "N/A": "#94a3b8",
  Blocked: "#f59e0b",
  "Not Tested": "#d1d5db",
}

const FINDING_COLORS: Record<string, string> = {
  "Expected Behavior": "#22c55e",
  "Bug/Glitch": "#ef4444",
  "Configuration Issue": "#f97316",
  "For Retesting": "#3b82f6",
  "Not Yet Reviewed": "#d1d5db",
}

const ACTOR_BADGE: Record<string, string> = {
  Candidate: "bg-sky-100 text-sky-800 border-sky-200",
  Recruiter: "bg-violet-100 text-violet-800 border-violet-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
}

const RESOLUTION_BADGE: Record<string, string> = {
  "Not Yet Started": "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Done": "bg-green-100 text-green-700",
  // Legacy values (from database default)
  pending: "bg-amber-100 text-amber-700",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\*\*(.+?)\*\*/g, "$1")          // bold
    .replace(/\*(.+?)\*/g, "$1")              // italic
    .replace(/<[^>]+>/g, "")                  // html tags
    .replace(/`(.+?)`/g, "$1")               // inline code
    .trim()
}


/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AnalyticsCharts({
  checklistItems,
  testers,
  responses,
  adminReviews,
}: {
  checklistItems: ChecklistItem[]
  testers: Tester[]
  responses: Response[]
  adminReviews: AdminReview[]
}) {
  const [filterScope, setFilterScope] = useState<"all" | "completed">("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [attentionPage, setAttentionPage] = useState(0)
  const reportRef = useRef<HTMLDivElement>(null)

  const ATTENTION_PAGE_SIZE = 10

  /* ---------- Completed tester IDs ---------- */
  const completedTesterIds = useMemo(() => {
    if (checklistItems.length === 0) return new Set<string>()
    const lastStepNumber = Math.max(...checklistItems.map((i) => i.step_number))
    const lastStepItemIds = new Set(
      checklistItems.filter((i) => i.step_number === lastStepNumber).map((i) => i.id)
    )
    const completedSet = new Set<string>()
    responses.forEach((r) => {
      if (r.status !== null && lastStepItemIds.has(r.checklist_item_id)) {
        completedSet.add(r.tester_id)
      }
    })
    return completedSet
  }, [checklistItems, responses])

  /* ---------- Admin review lookup (shared across memos) ---------- */
  const reviewMap = useMemo(
    () => new Map(adminReviews.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r])),
    [adminReviews]
  )

  /* ---------- Section 1: Completion funnel ---------- */
  const completionStats = useMemo(() => {
    if (checklistItems.length === 0) return { registered: 0, started: 0, completed: 0 }
    const startedSet = new Set<string>()
    responses.forEach((r) => {
      if (r.status !== null) startedSet.add(r.tester_id)
    })
    return {
      registered: testers.length,
      started: startedSet.size,
      completed: completedTesterIds.size,
    }
  }, [checklistItems, testers, responses, completedTesterIds])

  /* ---------- Section 2: Overall status breakdown (with scope filter) ---------- */
  const overallBreakdown = useMemo(() => {
    const scopedResponses =
      filterScope === "completed"
        ? responses.filter((r) => completedTesterIds.has(r.tester_id))
        : responses

    const scopedTesters =
      filterScope === "completed"
        ? testers.filter((t) => completedTesterIds.has(t.id))
        : testers

    const total = checklistItems.length * scopedTesters.length
    const statusCounts: Record<string, number> = { Pass: 0, Fail: 0, "N/A": 0, Blocked: 0 }

    scopedResponses.forEach((r) => {
      if (r.status && statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++
      }
    })

    const tested = Object.values(statusCounts).reduce((a, b) => a + b, 0)
    statusCounts["Not Tested"] = Math.max(0, total - tested)

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  }, [checklistItems, responses, testers, filterScope, completedTesterIds])

  /* ---------- Section 3: Talkpush Findings breakdown (non-Pass steps with admin review) ---------- */
  const findingsBreakdown = useMemo(() => {
    // Look at all non-Pass responses that have an admin review with a behavior_type set
    const findingCounts: Record<string, number> = {
      "Expected Behavior": 0,
      "Bug/Glitch": 0,
      "Configuration Issue": 0,
      "For Retesting": 0,
    }

    // Count non-Pass responses with a Talkpush finding
    let reviewedCount = 0
    let unreviewedCount = 0

    responses.forEach((r) => {
      if (r.status === "Pass" || r.status === null) return
      const review = reviewMap.get(`${r.tester_id}::${r.checklist_item_id}`)
      if (review?.behavior_type && findingCounts[review.behavior_type] !== undefined) {
        findingCounts[review.behavior_type]++
        reviewedCount++
      } else {
        unreviewedCount++
      }
    })

    // Only include categories that have values, plus always show "Not Yet Reviewed" if any
    const entries = Object.entries(findingCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))

    if (unreviewedCount > 0) {
      entries.push({ name: "Not Yet Reviewed", value: unreviewedCount })
    }

    return { entries, reviewedCount, unreviewedCount, total: reviewedCount + unreviewedCount }
  }, [responses, reviewMap])

  /* ---------- Client Report 1: Tester Participation ---------- */
  const testerParticipation = useMemo(() => {
    const total = checklistItems.length
    return testers.map((t) => {
      const tr = responses.filter((r) => r.tester_id === t.id)
      const pass = tr.filter((r) => r.status === "Pass").length
      const fail = tr.filter((r) => r.status === "Fail").length
      const na = tr.filter((r) => r.status === "N/A").length
      const blocked = tr.filter((r) => r.status === "Blocked").length
      const answered = tr.filter((r) => r.status !== null).length
      return {
        name: t.name,
        email: t.email,
        testCompleted: t.test_completed === "Yes",
        answered,
        total,
        pass,
        fail,
        na,
        blocked,
        hasIssues: fail > 0 || blocked > 0,
      }
    })
  }, [testers, responses, checklistItems])

  /* ---------- Client Report 2: Fail/Blocked steps table ---------- */
  const failedStepsRows = useMemo(() => {
    const itemMap = new Map(checklistItems.map((i) => [i.id, i]))
    const testerMap = new Map(testers.map((t) => [t.id, t]))

    const rows: {
      stepNumber: number
      actor: string
      action: string
      testerName: string
      testerEmail: string
      status: string
      behaviorType: string | null
      resolutionStatus: string
      notes: string | null
      comment: string | null
    }[] = []

    responses.forEach((r) => {
      if (r.status !== "Fail" && r.status !== "Blocked") return
      const item = itemMap.get(r.checklist_item_id)
      const tester = testerMap.get(r.tester_id)
      if (!item || !tester) return
      const review = reviewMap.get(`${r.tester_id}::${r.checklist_item_id}`)
      rows.push({
        stepNumber: item.step_number,
        actor: item.actor,
        action: stripMarkdown(item.action),
        testerName: tester.name,
        testerEmail: tester.email,
        status: r.status,
        behaviorType: review?.behavior_type ?? null,
        resolutionStatus: review?.resolution_status ?? "pending",
        notes: review?.notes ?? null,
        comment: r.comment ?? null,
      })
    })

    rows.sort((a, b) =>
      a.stepNumber !== b.stepNumber
        ? a.stepNumber - b.stepNumber
        : a.testerName.localeCompare(b.testerName)
    )

    return rows
  }, [responses, reviewMap, checklistItems, testers])

  /* ---------- PDF Download ---------- */
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).default
      const canvas = await html2canvas(reportRef.current, {
        scale: 1,
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL("image/jpeg", 0.7)
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 40
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 20
      pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 40
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 20
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - 40
      }
      pdf.save("UAT-Analytics-Report.pdf")
    } catch (err) {
      // PDF generation failed — surface the error in the console for debugging
      // without exposing raw error objects to the user.
      console.error("PDF generation failed:", err instanceof Error ? err.message : String(err))
    } finally {
      setIsGenerating(false)
    }
  }

  /* ---------- XLSX Export: Steps Requiring Attention ---------- */
  const handleDownloadXLSX = async () => {
    if (failedStepsRows.length === 0) return
    setIsExporting(true)
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet("Steps Requiring Attention")

      sheet.columns = [
        { header: "Step Number", key: "stepNumber", width: 14 },
        { header: "Step Description", key: "action", width: 50 },
        { header: "Tester Email", key: "testerEmail", width: 30 },
        { header: "Tester Finding", key: "testerFinding", width: 40 },
        { header: "Talkpush Finding", key: "talkpushFinding", width: 40 },
        { header: "Resolution", key: "resolution", width: 18 },
      ]

      sheet.getRow(1).font = { bold: true }

      for (const row of failedStepsRows) {
        const talkpushParts: string[] = []
        if (row.behaviorType) talkpushParts.push(row.behaviorType)
        if (row.notes) talkpushParts.push(row.notes)

        sheet.addRow({
          stepNumber: row.stepNumber,
          action: row.action,
          testerEmail: row.testerEmail,
          testerFinding: row.comment ?? "",
          talkpushFinding: talkpushParts.length > 0 ? talkpushParts.join(" — ") : "",
          resolution: row.resolutionStatus,
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Steps-Requiring-Attention.xlsx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("XLSX export failed:", err instanceof Error ? err.message : String(err))
    } finally {
      setIsExporting(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Empty state                                                       */
  /* ---------------------------------------------------------------- */

  if (checklistItems.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No checklist items to analyze</p>
        <p className="text-xs text-gray-400 mt-1">Upload a checklist first</p>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  const pct = (n: number, total: number) =>
    total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`

  return (
    <div className="space-y-6">

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/*  UAT Summary Report                                 */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 pt-2">
        <ClipboardList className="h-5 w-5 text-brand-sage-darker" />
        <h2 className="text-base font-semibold text-gray-900">UAT Summary Report</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Completion Overview */}
      <div className="grid grid-cols-3 gap-4">
        {/* Registered */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-6 pb-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-brand-sage-lightest flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-brand-sage-darker" />
            </div>
            <p className="text-4xl font-bold text-brand-sage-darker">{completionStats.registered}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Registered</p>
            <p className="text-xs text-gray-400 mt-0.5">Testers who signed up</p>
          </CardContent>
        </Card>

        {/* Started */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-6 pb-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-blue-600">{completionStats.started}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Started</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pct(completionStats.started, completionStats.registered)} of registered
            </p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-6 pb-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-green-600">{completionStats.completed}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Completed</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pct(completionStats.completed, completionStats.registered)} of registered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Status Breakdown */}
      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Overall Status Breakdown</CardTitle>
            {/* Scope pill toggle */}
            <div className="flex items-center rounded-full bg-gray-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setFilterScope("all")}
                className={`px-3 py-1 rounded-full transition-all ${
                  filterScope === "all"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All Testers
              </button>
              <button
                onClick={() => setFilterScope("completed")}
                className={`px-3 py-1 rounded-full transition-all ${
                  filterScope === "completed"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Completed Only
              </button>
            </div>
          </div>
          {filterScope === "completed" && completedTesterIds.size === 0 && (
            <p className="text-xs text-amber-600 mt-1">No testers have completed the final step yet.</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <ResponsiveContainer width={300} height={280}>
              <PieChart>
                <Pie
                  data={overallBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {overallBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-col gap-2.5 min-w-[180px]">
              {(() => {
                const legendTotal = overallBreakdown.reduce((sum, e) => sum + e.value, 0)
                const STATUS_DISPLAY: Record<string, string> = {
                  Pass: "Pass",
                  Fail: "Fail",
                  "N/A": "N/A",
                  Blocked: "Up For Review",
                  "Not Tested": "Not Tested",
                }
                return overallBreakdown.map((entry) => {
                  const pctLabel = legendTotal === 0
                    ? "0%"
                    : `${Math.round((entry.value / legendTotal) * 100)}%`
                  return (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                      />
                      <span className="text-sm text-gray-700 flex-1">
                        {STATUS_DISPLAY[entry.name] ?? entry.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {entry.value}
                        <span className="text-xs font-normal text-gray-400 ml-1">({pctLabel})</span>
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Talkpush Findings Breakdown — non-Pass steps reviewed by Talkpush */}
      {findingsBreakdown.total > 0 && (
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Talkpush Findings Breakdown</CardTitle>
            <p className="text-xs text-gray-500">
              Admin review findings for all non-Pass steps ({findingsBreakdown.total} total)
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <ResponsiveContainer width={300} height={280}>
                <PieChart>
                  <Pie
                    data={findingsBreakdown.entries}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {findingsBreakdown.entries.map((entry) => (
                      <Cell key={entry.name} fill={FINDING_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2.5 min-w-[200px]">
                {findingsBreakdown.entries.map((entry) => {
                  const pctLabel = findingsBreakdown.total === 0
                    ? "0%"
                    : `${Math.round((entry.value / findingsBreakdown.total) * 100)}%`
                  return (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: FINDING_COLORS[entry.name] ?? "#94a3b8" }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{entry.name}</span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {entry.value}
                        <span className="text-xs font-normal text-gray-400 ml-1">({pctLabel})</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={reportRef} className="space-y-6">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: Steps Requiring Attention                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Steps Requiring Attention
                </CardTitle>
                <p className="text-xs text-gray-500">
                  All steps with a Fail or Up For Review (Blocked) response, with admin review remarks
                </p>
              </div>
              {failedStepsRows.length > 0 && (
                <button
                  onClick={handleDownloadXLSX}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isExporting ? "Exporting\u2026" : "Export XLSX"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {failedStepsRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-400" />
                <p className="text-sm font-medium">No failed or flagged steps</p>
                <p className="text-xs mt-1">All responses are passing or not yet tested</p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(failedStepsRows.length / ATTENTION_PAGE_SIZE)
              const pageStart = attentionPage * ATTENTION_PAGE_SIZE
              const pageRows = failedStepsRows.slice(pageStart, pageStart + ATTENTION_PAGE_SIZE)
              return (
                <div>
                  <div className="divide-y divide-gray-100">
                    {pageRows.map((row, idx) => (
                      <div key={pageStart + idx} className="border-b border-gray-50 last:border-0">

                        {/* ── Step header ── */}
                        <div className="flex items-start gap-3 px-4 py-3 bg-gray-50/50">
                          <span className="inline-flex items-center justify-center h-6 rounded-md bg-white border border-gray-200 px-2 text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5 whitespace-nowrap">
                            Step {row.stepNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium flex-shrink-0 mt-0.5 ${ACTOR_BADGE[row.actor] ?? ""}`}
                          >
                            {row.actor}
                          </Badge>
                          <p className="text-sm text-gray-700 leading-relaxed">{row.action}</p>
                        </div>

                        {/* ── 3-column review grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">

                          {/* Col 1 — Tester Report */}
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tester Report</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-800">{row.testerName}</span>
                              {row.status === "Fail" ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Fail</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Up For Review</span>
                              )}
                            </div>
                            {row.comment ? (
                              <p className="text-sm text-gray-600 leading-relaxed">{row.comment}</p>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No comment provided</p>
                            )}
                          </div>

                          {/* Col 2 — Talkpush Finding */}
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Talkpush Finding</p>
                            {row.behaviorType ? (
                              <>
                                <span
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-2"
                                  style={{
                                    backgroundColor:
                                      row.behaviorType === "Expected Behavior" ? "#dcfce7"
                                      : row.behaviorType === "Bug/Glitch" ? "#fee2e2"
                                      : row.behaviorType === "For Retesting" ? "#dbeafe"
                                      : "#ffedd5",
                                    color:
                                      row.behaviorType === "Expected Behavior" ? "#166534"
                                      : row.behaviorType === "Bug/Glitch" ? "#991b1b"
                                      : row.behaviorType === "For Retesting" ? "#1e40af"
                                      : "#9a3412",
                                  }}
                                >
                                  {row.behaviorType}
                                </span>
                                {row.notes && (
                                  <p className="text-sm text-gray-600 leading-relaxed">{row.notes}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Not yet reviewed</p>
                            )}
                          </div>

                          {/* Col 3 — Resolution */}
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resolution</p>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                RESOLUTION_BADGE[row.resolutionStatus] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {row.resolutionStatus}
                            </span>
                          </div>

                        </div>{/* end grid */}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Showing {pageStart + 1}–{Math.min(pageStart + ATTENTION_PAGE_SIZE, failedStepsRows.length)} of {failedStepsRows.length} issues
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAttentionPage(p => p - 1)}
                          disabled={attentionPage === 0}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </button>
                        <span className="px-2 text-xs text-gray-500">{attentionPage + 1} / {totalPages}</span>
                        <button
                          onClick={() => setAttentionPage(p => p + 1)}
                          disabled={attentionPage >= totalPages - 1}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: Tester Participation Summary                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-sage-darker" />
                <CardTitle className="text-sm font-semibold text-gray-700">Tester Participation Summary</CardTitle>
              </div>
              <span className="text-xs text-gray-500">
                {testerParticipation.filter((t) => t.testCompleted).length} of {testerParticipation.length} marked complete
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {testerParticipation.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No testers registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Tester</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-36">Steps Done</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 w-16">Pass</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 w-16">Fail</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 w-16">N/A</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 w-24">Review</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-2.5 w-32">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testerParticipation.map((t, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-50 transition-colors ${
                          t.hasIssues ? "bg-red-50/20 hover:bg-red-50/40" : "hover:bg-gray-50/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-20">
                              <div
                                className="h-full bg-brand-sage rounded-full"
                                style={{ width: t.total === 0 ? "0%" : `${Math.round((t.answered / t.total) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
                              {t.answered}/{t.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-semibold text-green-600">{t.pass}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-semibold ${t.fail > 0 ? "text-red-600" : "text-gray-400"}`}>{t.fail}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-semibold text-gray-500">{t.na}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-semibold ${t.blocked > 0 ? "text-amber-600" : "text-gray-400"}`}>{t.blocked}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.testCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>{/* end reportRef */}

    </div>
  )
}
