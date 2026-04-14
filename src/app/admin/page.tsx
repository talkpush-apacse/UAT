export const dynamic = "force-dynamic"

import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FolderOpen, Building2, ArrowLeft } from "lucide-react"
import ClientGroupedDashboard, {
  type ClientGroup,
  type ProjectStatus,
  type ProjectWithCounts,
} from "@/components/admin/client-grouped-dashboard"
import ClientChecklistList from "@/components/admin/client-checklist-list"

function toTimestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0
}

function getProjectStatus(testerCount: number, signoffCount: number): ProjectStatus {
  if (signoffCount > 0) return "Signed Off"
  if (testerCount > 0) return "In Progress"
  return "Not Started"
}

function keepLatestTimestamp(
  activityByProject: Map<string, string>,
  projectId: string,
  candidateTimestamp: string | null | undefined
) {
  if (!candidateTimestamp) return

  const currentTimestamp = activityByProject.get(projectId)

  if (!currentTimestamp || toTimestamp(candidateTimestamp) > toTimestamp(currentTimestamp)) {
    activityByProject.set(projectId, candidateTimestamp)
  }
}

function assertNoQueryError(
  error: { message: string } | null,
  label: string
) {
  if (error) {
    console.error(`Admin dashboard ${label} query failed`, error)
    throw new Error("Failed to load admin dashboard data.")
  }
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { client?: string }
}) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, slug, company_name, title, test_scenario, created_at")
    .order("created_at", { ascending: false })

  assertNoQueryError(projectsError, "projects")

  const baseProjects = projects ?? []
  const projectIds = baseProjects.map((project) => project.id)

  let testers: {
    id: string
    project_id: string
    created_at: string | null
  }[] = []
  let signoffs: {
    project_id: string
    created_at: string | null
  }[] = []
  let checklistItems: {
    project_id: string
  }[] = []

  if (projectIds.length > 0) {
    const [testersResult, signoffsResult, checklistItemsResult] = await Promise.all([
      supabase
        .from("testers")
        .select("id, project_id, created_at")
        .in("project_id", projectIds)
        .range(0, 9999),
      supabase
        .from("signoffs")
        .select("project_id, created_at")
        .in("project_id", projectIds)
        .range(0, 9999),
      supabase
        .from("checklist_items")
        .select("project_id")
        .in("project_id", projectIds)
        .range(0, 9999),
    ])

    assertNoQueryError(testersResult.error, "testers")
    assertNoQueryError(signoffsResult.error, "signoffs")
    assertNoQueryError(checklistItemsResult.error, "checklist_items")

    testers = testersResult.data ?? []
    signoffs = signoffsResult.data ?? []
    checklistItems = checklistItemsResult.data ?? []
  }

  const testerIds = testers.map((tester) => tester.id)
  const testerProjectById = new Map(testers.map((tester) => [tester.id, tester.project_id]))

  let responses: {
    tester_id: string
    updated_at: string | null
  }[] = []
  let adminReviews: {
    tester_id: string
    updated_at: string | null
  }[] = []

  if (testerIds.length > 0) {
    const [responsesResult, adminReviewsResult] = await Promise.all([
      supabase
        .from("responses")
        .select("tester_id, updated_at")
        .in("tester_id", testerIds)
        .range(0, 9999),
      supabase
        .from("admin_reviews")
        .select("tester_id, updated_at")
        .in("tester_id", testerIds)
        .range(0, 9999),
    ])

    assertNoQueryError(responsesResult.error, "responses")
    assertNoQueryError(adminReviewsResult.error, "admin_reviews")

    responses = responsesResult.data ?? []
    adminReviews = adminReviewsResult.data ?? []
  }

  const testerCountByProject = new Map<string, number>()
  const signoffCountByProject = new Map<string, number>()
  const stepCountByProject = new Map<string, number>()
  const activityByProject = new Map<string, string>()

  for (const project of baseProjects) {
    keepLatestTimestamp(activityByProject, project.id, project.created_at)
  }

  for (const checklistItem of checklistItems) {
    stepCountByProject.set(
      checklistItem.project_id,
      (stepCountByProject.get(checklistItem.project_id) ?? 0) + 1
    )
  }

  for (const tester of testers) {
    testerCountByProject.set(
      tester.project_id,
      (testerCountByProject.get(tester.project_id) ?? 0) + 1
    )
    keepLatestTimestamp(activityByProject, tester.project_id, tester.created_at)
  }

  for (const signoff of signoffs) {
    signoffCountByProject.set(
      signoff.project_id,
      (signoffCountByProject.get(signoff.project_id) ?? 0) + 1
    )
    keepLatestTimestamp(activityByProject, signoff.project_id, signoff.created_at)
  }

  // Project recency is derived from downstream checklist activity because projects
  // do not have their own updated_at column in the current schema.
  for (const response of responses) {
    const projectId = testerProjectById.get(response.tester_id)
    if (!projectId) continue
    keepLatestTimestamp(activityByProject, projectId, response.updated_at)
  }

  for (const adminReview of adminReviews) {
    const projectId = testerProjectById.get(adminReview.tester_id)
    if (!projectId) continue
    keepLatestTimestamp(activityByProject, projectId, adminReview.updated_at)
  }

  const projectsWithCounts: ProjectWithCounts[] = baseProjects
    .map((project) => {
      const testerCount = testerCountByProject.get(project.id) ?? 0
      const signoffCount = signoffCountByProject.get(project.id) ?? 0

      return {
        ...project,
        testerCount,
        signoffCount,
        stepCount: stepCountByProject.get(project.id) ?? 0,
        status: getProjectStatus(testerCount, signoffCount),
        lastActivityAt: activityByProject.get(project.id) ?? project.created_at,
      }
    })
    .sort(
      (a, b) =>
        toTimestamp(b.lastActivityAt ?? b.created_at) - toTimestamp(a.lastActivityAt ?? a.created_at)
    )

  const recentlyAccessed = projectsWithCounts.slice(0, 5)

  const groupedByClient: ClientGroup[] = Object.entries(
    projectsWithCounts.reduce<Record<string, ProjectWithCounts[]>>((acc, project) => {
      const key = project.company_name || "Unknown Client"
      if (!acc[key]) acc[key] = []
      acc[key].push(project)
      return acc
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clientName, clientProjects]) => {
      const sortedProjects = [...clientProjects].sort(
        (a, b) =>
          toTimestamp(b.lastActivityAt ?? b.created_at) - toTimestamp(a.lastActivityAt ?? a.created_at)
      )

      return {
        clientName,
        activeCount: sortedProjects.filter((project) => project.status === "In Progress").length,
        completedCount: sortedProjects.filter((project) => project.status === "Signed Off").length,
        projects: sortedProjects,
      }
    })

  // ── Filtered client view ────────────────────────────────────────────────────
  const clientFilter = searchParams?.client
  if (clientFilter) {
    const decodedClient = decodeURIComponent(clientFilter)
    const matchingGroup = groupedByClient.find((g) => g.clientName === decodedClient)

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 -ml-2 gap-1.5 flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
                All Clients
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                Client
              </p>
              <h1 className="text-[28px] font-bold text-gray-900 leading-tight flex items-center gap-3 flex-wrap">
                <span className="truncate">{decodedClient}</span>
                {matchingGroup && (
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 flex-shrink-0">
                    {matchingGroup.projects.length}{" "}
                    {matchingGroup.projects.length === 1 ? "checklist" : "checklists"}
                  </span>
                )}
              </h1>
            </div>
          </div>
          <Link href="/admin/projects/new" className="flex-shrink-0">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New UAT Checklist
            </Button>
          </Link>
        </div>

        {!matchingGroup ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Client not found</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              No checklists exist for &ldquo;{decodedClient}&rdquo;
            </p>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to all clients
              </Button>
            </Link>
          </div>
        ) : (
          <ClientChecklistList group={matchingGroup} />
        )}
      </div>
    )
  }

  // ── Default: Client grid view ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">UAT Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="tabular-nums">{groupedByClient.length}</span>{" "}
            {groupedByClient.length === 1 ? "client" : "clients"} ·{" "}
            <span className="tabular-nums">{projectsWithCounts.length}</span>{" "}
            {projectsWithCounts.length === 1 ? "checklist" : "checklists"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/clients">
            <Button variant="outline" className="text-gray-600">
              <Building2 className="h-4 w-4 mr-1.5" />
              Manage Clients
            </Button>
          </Link>
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New UAT Checklist
            </Button>
          </Link>
        </div>
      </div>

      {projectsWithCounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No projects yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create your first UAT checklist to get started</p>
          <Link href="/admin/projects/new">
            <Button variant="outline" size="sm" className="text-brand-sage-darker border-brand-sage-lighter hover:bg-brand-sage-lightest">
              <Plus className="h-4 w-4 mr-1" />
              Create UAT Checklist
            </Button>
          </Link>
        </div>
      ) : (
        <ClientGroupedDashboard
          groups={groupedByClient}
          recentlyAccessed={recentlyAccessed}
        />
      )}
    </div>
  )
}
