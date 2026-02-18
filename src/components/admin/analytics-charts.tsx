"use client"

import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Filter, BarChart3 } from "lucide-react"

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
}

interface Response {
  tester_id: string
  checklist_item_id: string
  status: string | null
}

const STATUS_COLORS: Record<string, string> = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  "N/A": "#94a3b8",
  Blocked: "#f59e0b",
  "Not Tested": "#d1d5db",
}

export default function AnalyticsCharts({
  checklistItems,
  testers,
  responses,
  crmModules,
  actors,
}: {
  checklistItems: ChecklistItem[]
  testers: Tester[]
  responses: Response[]
  crmModules: string[]
  actors: string[]
}) {
  const [filterActor, setFilterActor] = useState<string>("all")
  const [filterModule, setFilterModule] = useState<string>("all")

  const filteredItems = useMemo(() => {
    return checklistItems.filter((item) => {
      if (filterActor !== "all" && item.actor !== filterActor) return false
      if (filterModule !== "all" && (item.crm_module || "") !== filterModule) return false
      return true
    })
  }, [checklistItems, filterActor, filterModule])

  const filteredItemIds = new Set(filteredItems.map((i) => i.id))
  const filteredResponses = responses.filter((r) => filteredItemIds.has(r.checklist_item_id))

  // Overall status breakdown
  const overallBreakdown = useMemo(() => {
    const total = filteredItems.length * testers.length
    const statusCounts: Record<string, number> = { Pass: 0, Fail: 0, "N/A": 0, Blocked: 0 }

    filteredResponses.forEach((r) => {
      if (r.status && statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++
      }
    })

    const tested = Object.values(statusCounts).reduce((a, b) => a + b, 0)
    statusCounts["Not Tested"] = Math.max(0, total - tested)

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }))
  }, [filteredItems, filteredResponses, testers])

  // Breakdown by actor
  const byActorData = useMemo(() => {
    return actors.map((actor) => {
      const actorItems = filteredItems.filter((i) => i.actor === actor)
      const actorItemIds = new Set(actorItems.map((i) => i.id))
      const actorResponses = filteredResponses.filter((r) => actorItemIds.has(r.checklist_item_id))

      const counts: Record<string, number> = { Pass: 0, Fail: 0, "N/A": 0, Blocked: 0 }
      actorResponses.forEach((r) => {
        if (r.status && counts[r.status] !== undefined) counts[r.status]++
      })

      return { name: actor, ...counts }
    })
  }, [actors, filteredItems, filteredResponses])

  // Breakdown by CRM Module
  const byModuleData = useMemo(() => {
    const modules = [...crmModules]
    if (filteredItems.some((i) => !i.crm_module)) modules.push("(No Module)")

    return modules.map((mod) => {
      const modItems = filteredItems.filter((i) =>
        mod === "(No Module)" ? !i.crm_module : i.crm_module === mod
      )
      const modItemIds = new Set(modItems.map((i) => i.id))
      const modResponses = filteredResponses.filter((r) => modItemIds.has(r.checklist_item_id))

      const counts: Record<string, number> = { Pass: 0, Fail: 0, "N/A": 0, Blocked: 0 }
      modResponses.forEach((r) => {
        if (r.status && counts[r.status] !== undefined) counts[r.status]++
      })

      return { name: mod, ...counts }
    })
  }, [crmModules, filteredItems, filteredResponses])

  // Per-tester completion
  const perTesterData = useMemo(() => {
    return testers.map((tester) => {
      const testerResponses = filteredResponses.filter((r) => r.tester_id === tester.id)
      const completed = testerResponses.filter((r) => r.status !== null).length
      const total = filteredItems.length

      return {
        name: tester.name,
        completed,
        remaining: Math.max(0, total - completed),
      }
    })
  }, [testers, filteredResponses, filteredItems])

  if (checklistItems.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No checklist items to analyze</p>
        <p className="text-xs text-gray-400 mt-1">Upload a checklist first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-emerald-700" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Actor</Label>
              <Select value={filterActor} onValueChange={setFilterActor}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">CRM Module</Label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {crmModules.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-gray-500">
                Showing {filteredItems.length} of {checklistItems.length} steps
                {testers.length > 0 && ` across ${testers.length} tester${testers.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall Donut */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Overall Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={overallBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                >
                  {overallBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Actor */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Results by Actor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byActorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pass" fill={STATUS_COLORS.Pass} stackId="a" />
                <Bar dataKey="Fail" fill={STATUS_COLORS.Fail} stackId="a" />
                <Bar dataKey="N/A" fill={STATUS_COLORS["N/A"]} stackId="a" />
                <Bar dataKey="Blocked" fill={STATUS_COLORS.Blocked} stackId="a" name="Up For Review" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By CRM Module */}
        {byModuleData.length > 0 && (
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Results by CRM Module</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byModuleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Pass" fill={STATUS_COLORS.Pass} stackId="a" />
                  <Bar dataKey="Fail" fill={STATUS_COLORS.Fail} stackId="a" />
                  <Bar dataKey="N/A" fill={STATUS_COLORS["N/A"]} stackId="a" />
                  <Bar dataKey="Blocked" fill={STATUS_COLORS.Blocked} stackId="a" name="Up For Review" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Per-tester Completion */}
        {perTesterData.length > 0 && (
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Per-Tester Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={perTesterData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#003d1c" stackId="a" name="Completed" />
                  <Bar dataKey="remaining" fill="#d1d5db" stackId="a" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
