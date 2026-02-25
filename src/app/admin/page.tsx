export const dynamic = "force-dynamic"

import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, FolderOpen } from "lucide-react"
import ClientGroupedDashboard, {
  type ClientGroup,
  type ProjectWithCounts,
} from "@/components/admin/client-grouped-dashboard"

export default async function AdminDashboard() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()

  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, company_name, test_scenario, created_at")
    .order("created_at", { ascending: false })

  // Get tester counts per project
  const projectsWithCounts = await Promise.all(
    (projects || []).map(async (project) => {
      const { count } = await supabase
        .from("testers")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)

      const { count: signoffCount } = await supabase
        .from("signoffs")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)

      return { ...project, testerCount: count || 0, signoffCount: signoffCount || 0 }
    })
  )

  // Group projects by client name
  const groupedByClient: ClientGroup[] = Object.entries(
    projectsWithCounts.reduce<Record<string, ProjectWithCounts[]>>(
      (acc, project) => {
        const key = project.company_name || "Unknown Client"
        if (!acc[key]) acc[key] = []
        acc[key].push(project)
        return acc
      },
      {}
    )
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clientName, clientProjects]) => ({
      clientName,
      projects: clientProjects.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">UAT Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projectsWithCounts.length} {projectsWithCounts.length === 1 ? "checklist" : "checklists"}
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            New UAT Checklist
          </Button>
        </Link>
      </div>

      {projectsWithCounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No projects yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create your first UAT checklist to get started</p>
          <Link href="/admin/projects/new">
            <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Plus className="h-4 w-4 mr-1" />
              Create UAT Checklist
            </Button>
          </Link>
        </div>
      ) : (
        <ClientGroupedDashboard groups={groupedByClient} />
      )}
    </div>
  )
}
