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
  ShieldCheck,
  AlertTriangle,
  BookCheck,
  Download,
  ChevronDown,
  ChevronUp,
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

const ACTOR_BADGE: Record<string, string> = {
  Candidate: "bg-sky-100 text-sky-800 border-sky-200",
  Recruiter: "bg-violet-100 text-violet-800 border-violet-200",
  Talkpush: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

const RESOLUTION_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
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
  crmModules,
}: {
  checklistItems: ChecklistItem[]
  testers: Tester[]
  responses: Response[]
  adminReviews: AdminReview[]
  crmModules: string[]
  actors: string[]
}) {
  const [filterScope, setFilterScope] = useState<"all" | "completed">("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const reportRef = useRef<HTMLDivElement>(null)

  const toggleRow = (i: number) =>
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })

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

  /* ---------- Client Report 1: Readiness Score ---------- */
  const readinessData = useMemo(() => {
    const completedResponses = responses.filter((r) => completedTesterIds.has(r.tester_id))
    const total = completedResponses.length
    const passing = completedResponses.filter(
      (r) => r.status === "Pass" || r.status === "N/A"
    ).length
    const failing = completedResponses.filter(
      (r) => r.status === "Fail" || r.status === "Blocked"
    ).length
    const score = total === 0 ? null : Math.round((passing / total) * 100)
    const label =
      score === null ? "No Data" :
      score >= 90 ? "Ready" :
      score >= 70 ? "Needs Review" :
      "Not Ready"
    const color =
      score === null ? "gray" :
      score >= 90 ? "green" :
      score >= 70 ? "amber" :
      "red"

    const reviewMap = new Map(adminReviews.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r]))
    const openIssueCount = responses.filter((r) => {
      if (r.status !== "Fail" && r.status !== "Blocked") return false
      const rev = reviewMap.get(`${r.tester_id}::${r.checklist_item_id}`)
      return !rev || rev.resolution_status !== "resolved"
    }).length

    return { score, label, color, passing, failing, total, openIssueCount }
  }, [responses, completedTesterIds, adminReviews])

  /* ---------- Client Report 2: Tester Participation ---------- */
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

  /* ---------- Client Report 3: Fail/Blocked steps table ---------- */
  const failedStepsRows = useMemo(() => {
    const reviewMap = new Map(
      adminReviews.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r])
    )

    const itemMap = new Map(checklistItems.map((i) => [i.id, i]))
    const testerMap = new Map(testers.map((t) => [t.id, t]))

    const rows: {
      stepNumber: number
      actor: string
      action: string
      testerName: string
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
  }, [responses, adminReviews, checklistItems, testers])

  /* ---------- Client Report 4: Module Coverage ---------- */
  const moduleCoverage = useMemo(() => {
    const modules = [
      ...crmModules,
      ...(checklistItems.some((i) => !i.crm_module) ? ["(No Module)"] : []),
    ]
    return modules.map((mod) => {
      const modItems = checklistItems.filter((i) =>
        mod === "(No Module)" ? !i.crm_module : i.crm_module === mod
      )
      const modItemIds = new Set(modItems.map((i) => i.id))
      const modResponses = responses.filter((r) => modItemIds.has(r.checklist_item_id))
      const pass = modResponses.filter((r) => r.status === "Pass" || r.status === "N/A").length
      const issues = modResponses.filter((r) => r.status === "Fail" || r.status === "Blocked").length
      const passRate = modResponses.length === 0 ? null : Math.round((pass / modResponses.length) * 100)
      return {
        module: mod,
        stepCount: modItems.length,
        responseCount: modResponses.length,
        passRate,
        issues,
        allClear: issues === 0 && modResponses.length > 0,
      }
    })
  }, [crmModules, checklistItems, responses])

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
      console.error("PDF generation failed", err)
    } finally {
      setIsGenerating(false)
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

      {/* Download PDF button */}
      <div className="flex justify-end">
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
        <ClipboardList className="h-5 w-5 text-emerald-700" />
        <h2 className="text-base font-semibold text-gray-900">UAT Summary Report</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Completion Overview */}
      <div className="grid grid-cols-3 gap-4">
        {/* Registered */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardContent className="pt-6 pb-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-emerald-700" />
            </div>
            <p className="text-4xl font-bold text-emerald-700">{completionStats.registered}</p>
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
            <div className="flex flex-col gap-2.5 min-w-[160px]">
              {overallBreakdown.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                  />
                  <span className="text-sm text-gray-700 flex-1">{entry.name}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: UAT Readiness Score                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className={`rounded-xl border shadow-sm overflow-hidden ${
          readinessData.color === "green" ? "bg-green-50 border-green-200" :
          readinessData.color === "amber" ? "bg-amber-50 border-amber-200" :
          readinessData.color === "red"   ? "bg-red-50 border-red-200" :
          "bg-gray-50 border-gray-200"
        }`}>
          <CardContent className="py-6 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Score circle */}
              <div className="flex items-center gap-5 flex-shrink-0">
                <div className={`h-20 w-20 rounded-full flex flex-col items-center justify-center border-4 ${
                  readinessData.color === "green" ? "border-green-400 bg-green-100" :
                  readinessData.color === "amber" ? "border-amber-400 bg-amber-100" :
                  readinessData.color === "red"   ? "border-red-400 bg-red-100" :
                  "border-gray-300 bg-gray-100"
                }`}>
                  {readinessData.score !== null ? (
                    <>
                      <span className={`text-2xl font-bold leading-none ${
                        readinessData.color === "green" ? "text-green-700" :
                        readinessData.color === "amber" ? "text-amber-700" :
                        "text-red-700"
                      }`}>{readinessData.score}%</span>
                      <span className="text-xs text-gray-500 mt-0.5">Score</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">No Data</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {readinessData.color === "green" && <ShieldCheck className="h-5 w-5 text-green-600" />}
                    {readinessData.color === "amber" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    {readinessData.color === "red"   && <AlertTriangle className="h-5 w-5 text-red-600" />}
                    <span className={`text-lg font-bold ${
                      readinessData.color === "green" ? "text-green-800" :
                      readinessData.color === "amber" ? "text-amber-800" :
                      readinessData.color === "red"   ? "text-red-800" :
                      "text-gray-600"
                    }`}>{readinessData.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">UAT Readiness Score</p>
                  <p className="text-xs text-gray-400 mt-0.5">Based on completed testers only</p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: Tester Participation Summary                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700" />
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
                                className="h-full bg-emerald-500 rounded-full"
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

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: Failed & Up For Review Steps                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Failed &amp; Up For Review Steps
            </CardTitle>
            <p className="text-xs text-gray-500">
              All steps with a Fail or Up For Review (Blocked) response, with admin review remarks
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {failedStepsRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-400" />
                <p className="text-sm font-medium">No failed or flagged steps</p>
                <p className="text-xs mt-1">All responses are passing or not yet tested</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-14">Step</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-24">Actor</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Action</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-32">Tester</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-28">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-36">Talkpush Finding</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Comment</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-28">Resolution</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedStepsRows.map((row, idx) => {
                      const isExpanded = expandedRows.has(idx)
                      return (
                      <tr
                        key={idx}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                          idx % 2 === 0 ? "" : "bg-gray-50/30"
                        }`}
                      >
                        {/* Step # */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">
                            {row.stepNumber}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${ACTOR_BADGE[row.actor] ?? ""}`}
                          >
                            {row.actor}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex items-start gap-1.5">
                            <span className={isExpanded ? "whitespace-normal flex-1" : "line-clamp-1 flex-1 min-w-0"}>
                              {row.action}
                            </span>
                            <button
                              onClick={() => toggleRow(idx)}
                              className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
                              aria-label={isExpanded ? "Collapse row" : "Expand row"}
                            >
                              {isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Tester */}
                        <td className="px-4 py-3 text-gray-700 font-medium">{row.testerName}</td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {row.status === "Fail" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              Fail
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              Up For Review
                            </span>
                          )}
                        </td>

                        {/* Talkpush Finding (was "Issue Type") */}
                        <td className="px-4 py-3">
                          {row.behaviorType ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor:
                                  row.behaviorType === "Expected Behavior"
                                    ? "#dcfce7"
                                    : row.behaviorType === "Bug/Glitch"
                                    ? "#fee2e2"
                                    : "#ffedd5",
                                color:
                                  row.behaviorType === "Expected Behavior"
                                    ? "#166534"
                                    : row.behaviorType === "Bug/Glitch"
                                    ? "#991b1b"
                                    : "#9a3412",
                              }}
                            >
                              {row.behaviorType}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Comment (tester's comment) */}
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {row.comment ? (
                            <span className={isExpanded ? "whitespace-normal" : "line-clamp-1"}>{row.comment}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Resolution */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              RESOLUTION_BADGE[row.resolutionStatus] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {row.resolutionStatus}
                          </span>
                        </td>

                        {/* Findings (admin notes) */}
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {row.notes ? (
                            <span className={isExpanded ? "whitespace-normal" : "line-clamp-1"}>{row.notes}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CLIENT REPORT: Module Coverage Report                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {moduleCoverage.length > 0 && (
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookCheck className="h-4 w-4 text-emerald-700" />
                <CardTitle className="text-sm font-semibold text-gray-700">Module Coverage Report</CardTitle>
              </div>
              <p className="text-xs text-gray-500">Pass rate and issue count per CRM module</p>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Module</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-2.5 w-24">Steps</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-48">Pass Rate</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-2.5 w-24">Issues</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleCoverage.map((m, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{m.module}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.stepCount}</td>
                        <td className="px-4 py-3">
                          {m.passRate === null ? (
                            <span className="text-xs text-gray-400">No responses yet</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-28">
                                <div
                                  className={`h-full rounded-full ${m.passRate >= 90 ? "bg-green-500" : m.passRate >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${m.passRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 tabular-nums w-10">{m.passRate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.issues > 0 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-xs font-bold text-red-700">{m.issues}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.responseCount === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Not Started</span>
                          ) : m.allClear ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> All Clear
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Has Issues
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>{/* end reportRef */}

    </div>
  )
}
