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
  Search,
  Users,
  LayoutList,
  LayoutGrid,
  Pencil,
  ExternalLink,
  Copy,
  Loader2,
  Trash2,
  SearchX,
  Plus,
} from "lucide-react"
import { deleteProject } from "@/lib/actions/projects"
import DuplicateProjectDialog from "@/components/admin/duplicate-project-dialog"
import { toast } from "sonner"
import type { ClientGroup, ProjectWithCounts, ProjectStatus } from "./client-grouped-dashboard"

function getProjectStatus(project: ProjectWithCounts): ProjectStatus {
  if (project.signoffCount > 0) return "Signed Off"
  if (project.testerCount > 0) return "In Progress"
  return "Not Started"
}

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

function TableDuplicateButton({
  projectId,
  companyName,
  projectTitle,
}: {
  projectId: string
  companyName: string
  projectTitle: string | null
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        aria-label="Duplicate checklist"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      <DuplicateProjectDialog
        projectId={projectId}
        companyName={companyName}
        title={projectTitle}
        open={open}
        onOpenChange={setOpen}
        onBusyChange={setLoading}
      />
    </>
  )
}

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
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Delete Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface Props {
  group: ClientGroup
}

export default function ClientChecklistList({ group }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProjects = group.projects.filter(
    (p) =>
      !searchQuery ||
      (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search + view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter checklists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker focus:outline-none"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker focus-visible:ring-inset ${
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

      {/* Empty search state */}
      {filteredProjects.length === 0 && searchQuery && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <SearchX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            No checklists match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-gray-400 mb-5">Try a different title or slug.</p>
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

      {/* TABLE VIEW */}
      {viewMode === "table" && filteredProjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
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
                {filteredProjects.map((project) => {
                  const status = getProjectStatus(project)
                  return (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/admin/projects/${project.slug}`)}
                      className="group border-t border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 border-l-[3px] border-l-transparent group-hover:border-l-brand-sage-darker transition-colors">
                        <div>
                          <span className="font-medium text-gray-900 group-hover:text-brand-sage-darker transition-colors">
                            {project.title || project.company_name}
                          </span>
                          <span className="block text-xs text-gray-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            /test/{project.slug}
                          </span>
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
                        {project.created_at
                          ? new Date(project.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                          <TableDuplicateButton
                            projectId={project.id}
                            companyName={project.company_name}
                            projectTitle={project.title}
                          />
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

      {/* CARDS VIEW */}
      {viewMode === "cards" && filteredProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const status = getProjectStatus(project)
            return (
              <Link key={project.id} href={`/admin/projects/${project.slug}`}>
                <Card className="group bg-white rounded-xl border border-gray-100 border-l-[3px] border-l-brand-sage-darker shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer h-full">
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
                        {project.created_at
                          ? new Date(project.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
