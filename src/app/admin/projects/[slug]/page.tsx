export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import LiveProgressTable from "@/components/admin/live-progress-table"
import type { TesterProgress } from "@/components/admin/live-progress-table"
import CopyLinkButton from "@/components/admin/copy-link-button"

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
    .select("*")
    .eq("slug", params.slug)
    .single()

  if (!project) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checklistItems: any[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let signoffs: any[] | null = null
  let initialTesters: TesterProgress[] = []

  try {
    const checklistResult = await supabase
      .from("checklist_items")
      .select("*")
      .eq("project_id", project.id)
      .order("sort_order")
    checklistItems = checklistResult.data

    const signoffResult = await supabase
      .from("signoffs")
      .select("*")
      .eq("project_id", project.id)
      .order("signoff_date", { ascending: false })
    signoffs = signoffResult.data

    // Query testers and their responses server-side for initial render
    const { data: testers } = await supabase
      .from("testers")
      .select("id, name, email, mobile")
      .eq("project_id", project.id)

    if (testers && testers.length > 0) {
      const { data: responses } = await supabase
        .from("responses")
        .select("tester_id, status")
        .in("tester_id", testers.map((t) => t.id))

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
        }
      })
    }
  } catch (err) {
    console.error("Project detail page data fetch error:", err)
    // Continue rendering with empty data rather than crashing
  }

  const itemCount = checklistItems?.length || 0

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Projects
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.company_name}</h1>
          <p className="text-sm text-muted-foreground font-mono">/{project.slug}</p>
          {project.test_scenario && (
            <p className="text-sm text-muted-foreground mt-1">{project.test_scenario}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton slug={project.slug} />
          <Link href={`/admin/projects/${project.slug}/edit`}>
            <Button variant="outline" size="sm">Edit Project</Button>
          </Link>
        </div>
      </div>

      {(signoffs && signoffs.length > 0) && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-600">Signed Off</Badge>
              <span className="text-sm font-medium">UAT Sign-Off Complete</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {signoffs.map((s) => (
                <p key={s.id}>{s.signoff_name} — {new Date(s.signoff_date).toLocaleDateString()}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        <Link href={`/admin/projects/${project.slug}/upload`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-medium">Upload Checklist</p>
              <p className="text-xs text-muted-foreground">{itemCount} steps</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/projects/${project.slug}/checklist`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-medium">Manage Steps</p>
              <p className="text-xs text-muted-foreground">Edit & Reorder</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/projects/${project.slug}/analytics`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-medium">Analytics</p>
              <p className="text-xs text-muted-foreground">Charts & Filters</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/projects/${project.slug}/signoff`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-medium">Sign Off</p>
              <p className="text-xs text-muted-foreground">{signoffs?.length || 0} sign-offs</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <a href={`/admin/projects/${project.slug}/export`}>
          <Button variant="outline" size="sm">Export Results (.xlsx)</Button>
        </a>
      </div>

      <Separator className="mb-6" />

      {itemCount > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Checklist Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">#</th>
                  <th className="text-left p-2 font-medium">Path</th>
                  <th className="text-left p-2 font-medium">Actor</th>
                  <th className="text-left p-2 font-medium">Action</th>
                  <th className="text-left p-2 font-medium">Module</th>
                </tr>
              </thead>
              <tbody>
                {checklistItems?.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">{item.step_number}</td>
                    <td className="p-2">
                      {item.path && <Badge variant="outline">{item.path}</Badge>}
                    </td>
                    <td className="p-2">{item.actor}</td>
                    <td className="p-2">{item.action}</td>
                    <td className="p-2 text-muted-foreground">{item.crm_module || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Tester Progress</h2>
      <LiveProgressTable
        slug={project.slug}
        totalItems={itemCount}
        initialTesters={initialTesters}
      />
    </div>
  )
}
