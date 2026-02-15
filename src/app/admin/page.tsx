import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function AdminDashboard() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link href="/admin/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {projectsWithCounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No projects yet. Create your first project to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithCounts.map((project) => (
            <Link key={project.id} href={`/admin/projects/${project.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.company_name}</CardTitle>
                    {project.signoffCount > 0 && (
                      <Badge variant="default" className="bg-green-600">Signed Off</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    /{project.slug}
                  </p>
                </CardHeader>
                <CardContent>
                  {project.test_scenario && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.test_scenario}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{project.testerCount} tester{project.testerCount !== 1 ? "s" : ""}</span>
                    <span>
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
