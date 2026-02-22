export const dynamic = "force-dynamic"

import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, FolderOpen } from "lucide-react"

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithCounts.map((project) => {
            const status =
              project.signoffCount > 0
                ? { label: "Signed Off", color: "bg-green-50 text-green-700 border-green-200" }
                : project.testerCount === 0
                ? { label: "Not Started", color: "bg-gray-100 text-gray-500 border-gray-200" }
                : { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" }
            return (
            <Link key={project.id} href={`/admin/projects/${project.slug}`}>
              <Card className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle
                      className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug"
                      title={project.company_name}
                    >
                      {project.company_name}
                    </CardTitle>
                    <Badge variant="outline" className={`text-xs ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    /{project.slug}
                  </p>
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
                      {project.testerCount} tester{project.testerCount !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {new Date(project.created_at).toLocaleDateString()}
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
