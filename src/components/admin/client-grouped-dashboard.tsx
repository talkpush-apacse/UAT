"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  ChevronsUpDown,
  LayoutList,
  LayoutGrid,
  Pencil,
  ExternalLink,
  Trash2,
  SearchX,
  Plus,
} from "lucide-react"
import { deleteProject } from "@/lib/actions/projects"
import { toast } from "sonner"

export interface ProjectWithCounts {
  id: string
  slug: string
  company_name: string
  title: string | null
  test_scenario: string | null
  created_at: string
  testerCount: number
  signoffCount: number
}

export interface ClientGroup {
  clientName: string
  projects: ProjectWithCounts[]
}

interface Props {
  groups: ClientGroup[]
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type ProjectStatus = "Signed Off" | "In Progress" | "Not Started"

function getProjectStatus(project: ProjectWithCounts): ProjectStatus {
  if (project.signoffCount > 0) return "Signed Off"
  if (project.testerCount > 0) return "In Progress"
  return "Not Started"
}

/**
 * P3 — Unified project-level status badge.
 * Signed Off  → solid green fill (terminal state)
 * In Progress → amber tint (active state)
 * Not Started → neutral gray (inactive state)
 */
function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    "Signed Off": "bg-green-600 text-white border-transparent",
    "In Progress": "bg-[#FEF3C7] text-[#92400E] border-amber-200",
    "Not Started": "bg-[#F3F4F6] text-[#6B7280] border-gray-200",
  }
  return (
    <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {status}
    </Badge>
  )
}

/**
 * Compact trash-icon-only delete button for table rows.
 * Uses the same deleteProject server action as DeleteProjectButton.
 */
function TableDeleteButton({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteProject(projectId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Project deleted")
      router.refresh()
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{projectName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this project and all its checklist steps,
            testers, responses, attachments, and sign-offs. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function ClientGroupedDashboard({ groups }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.clientName))
  )
  const [searchQuery, setSearchQuery] = useState("")

  const toggleGroup = (clientName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(clientName)) {
        next.delete(clientName)
      } else {
        next.add(clientName)
      }
      return next
    })
  }

  const expandAll = () =>
    setExpandedGroups(new Set(filteredGroups.map((g) => g.clientName)))
  const collapseAll = () => setExpandedGroups(new Set())

  const filteredGroups = groups
    .map((group) => {
      const query = searchQuery.toLowerCase()
      if (group.clientName.toLowerCase().includes(query)) {
        return group
      }
      const matchingProjects = group.projects.filter(
        (p) =>
          p.company_name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          (p.title && p.title.toLowerCase().includes(query))
      )
      if (matchingProjects.length > 0) {
        return { ...group, projects: matchingProjects }
      }
      return null
    })
    .filter((g): g is ClientGroup => g !== null)

  // Flat list of all projects for table view
  const allProjects = filteredGroups.flatMap((g) => g.projects)

  return (
    <div className="space-y-4">
      {/* ── Search bar + controls ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by client or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker focus:outline-none"
          />
        </div>

        {/* Expand / Collapse — compact button group, only in cards view */}
        {viewMode === "cards" && (
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={expandAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              <ChevronsUpDown className="h-3 w-3" />
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors border-l border-gray-200 whitespace-nowrap"
            >
              Collapse
            </button>
          </div>
        )}

        {/* P1 — View mode toggle */}
        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
              viewMode === "cards"
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      {/* ── Empty state — shown when search returns no results ── */}
      {filteredGroups.length === 0 && searchQuery && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <SearchX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            No checklists match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Try a different client name, project title, or slug.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-brand-sage-darker font-medium hover:underline"
            >
              Clear filter
            </button>
            <span className="text-gray-300">·</span>
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-1 text-sm text-brand-sage-darker font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              New UAT Checklist
            </Link>
          </div>
        </div>
      )}

      {/* ── P1: TABLE VIEW ── */}
      {viewMode === "table" && filteredGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Checklist Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Testers
                  </th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {allProjects.map((project) => {
                  const status = getProjectStatus(project)
                  return (
                    <tr
                      key={project.id}
                      onClick={() =>
                        router.push(`/admin/projects/${project.slug}`)
                      }
                      className="group border-t border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {project.company_name}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-900 group-hover:text-brand-sage-darker transition-colors">
                            {project.title || project.company_name}
                          </span>
                          <span className="block text-xs text-gray-400 font-mono mt-0.5">/test/{project.slug}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ProjectStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="h-3.5 w-3.5" />
                          {project.testerCount}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </td>
                      {/* Stop row-click from firing inside the actions cell */}
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/projects/${project.slug}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-brand-sage-darker hover:bg-brand-sage-lightest"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/admin/projects/${project.slug}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <TableDeleteButton
                            projectId={project.id}
                            projectName={project.title || project.company_name}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {viewMode === "cards" && filteredGroups.length > 0 && (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isSingleItem = group.projects.length === 1

            // P5 — Aggregate status counts for multi-item group headers
            const signedOffCount = group.projects.filter(
              (p) => p.signoffCount > 0
            ).length
            const inProgressCount = group.projects.filter(
              (p) => p.signoffCount === 0 && p.testerCount > 0
            ).length
            const notStartedCount = group.projects.filter(
              (p) => p.signoffCount === 0 && p.testerCount === 0
            ).length

            // P4 — Flatten single-item groups: no accordion wrapper
            // P3e — Wrap in 3-col grid so card sits in col-1, not full-width
            if (isSingleItem) {
              const project = group.projects[0]
              const status = getProjectStatus(project)
              return (
                <div key={project.id} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link
                  href={`/admin/projects/${project.slug}`}
                >
                  <Card className="group bg-white rounded-xl border border-gray-100 border-l-[3px] border-l-brand-sage-darker shadow-sm hover:shadow-md hover:border-gray-200 hover:border-l-brand-sage-darker transition-all duration-200 cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {/* Client name as overline — P4 inline context */}
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                            {project.company_name}
                          </p>
                          <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
                            {project.title || project.company_name}
                          </CardTitle>
                        </div>
                        <ProjectStatusBadge status={status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {project.test_scenario && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                          {project.test_scenario}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.testerCount} tester
                          {project.testerCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </div>
              )
            }

            // Multi-item group: accordion with aggregate status (P4 + P5)
            const isOpen = expandedGroups.has(group.clientName)
            return (
              <div
                key={group.clientName}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Group header with aggregate status */}
                <button
                  onClick={() => toggleGroup(group.clientName)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-base font-semibold text-gray-900">
                      {group.clientName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                    >
                      {group.projects.length} checklists
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* P5 — Aggregate status summary pills */}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                      {signedOffCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                          {signedOffCount} Signed Off
                        </span>
                      )}
                      {inProgressCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                          {inProgressCount} In Progress
                        </span>
                      )}
                      {notStartedCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block flex-shrink-0" />
                          {notStartedCount} Not Started
                        </span>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Project cards grid */}
                {isOpen && (
                  <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.projects.map((project) => {
                        const status = getProjectStatus(project)
                        return (
                          <Link
                            key={project.id}
                            href={`/admin/projects/${project.slug}`}
                          >
                            <Card className="group bg-white rounded-xl border border-gray-100 border-l-[3px] border-l-brand-sage-darker shadow-sm hover:shadow-md hover:border-gray-200 hover:border-l-brand-sage-darker transition-all duration-200 cursor-pointer h-full">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                  <CardTitle
                                    className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug"
                                    title={project.title || project.company_name}
                                  >
                                    {project.title || project.company_name}
                                  </CardTitle>
                                  <ProjectStatusBadge status={status} />
                                </div>
                              </CardHeader>
                              <CardContent>
                                {project.test_scenario && (
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                    {project.test_scenario}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {project.testerCount} tester
                                    {project.testerCount !== 1 ? "s" : ""}
                                  </span>
                                  <span>
                                    {new Date(
                                      project.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
