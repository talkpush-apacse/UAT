import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createAdminClient()

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", params.slug)
      .single()

    if (projectError) {
      console.error("Progress API - project lookup error:", projectError.message, "slug:", params.slug)
      return NextResponse.json({ error: "Project not found", debug: projectError.message }, { status: 404 })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: testers, error: testersError } = await supabase
      .from("testers")
      .select("id, name, email, mobile")
      .eq("project_id", project.id)

    if (testersError) {
      console.error("Progress API - testers lookup error:", testersError.message)
    }

    if (!testers || testers.length === 0) {
      return NextResponse.json({ testers: [], debug: { projectId: project.id, testersError: testersError?.message } })
    }

    const { data: responses } = await supabase
      .from("responses")
      .select("tester_id, status")
      .in("tester_id", testers.map((t) => t.id))

    const testerProgress = testers.map((tester) => {
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

    return NextResponse.json({ testers: testerProgress })
  } catch (err) {
    console.error("Progress API - unexpected error:", err)
    return NextResponse.json({ error: "Internal server error", debug: String(err) }, { status: 500 })
  }
}
