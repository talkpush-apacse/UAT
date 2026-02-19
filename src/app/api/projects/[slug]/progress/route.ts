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
      .order("created_at", { ascending: true })

    if (testersError) {
      console.error("Progress API - testers lookup error:", testersError.message)
    }

    if (!testers || testers.length === 0) {
      return NextResponse.json({ testers: [] }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      })
    }

    // Fetch checklist item IDs scoped to this project so responses are
    // counted only for items that belong here (not other projects the
    // same tester may have participated in).
    const { data: checklistItems } = await supabase
      .from("checklist_items")
      .select("id")
      .eq("project_id", project.id)

    const itemIds = (checklistItems || []).map((ci) => ci.id)

    // If there are no checklist items, there can be no responses to count.
    if (itemIds.length === 0) {
      const emptyProgress = testers.map((tester) => ({
        id: tester.id,
        name: tester.name,
        email: tester.email,
        mobile: tester.mobile,
        total: 0,
        completed: 0,
        pass: 0,
        fail: 0,
        na: 0,
        blocked: 0,
      }))
      return NextResponse.json({ testers: emptyProgress }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      })
    }

    const { data: responses } = await supabase
      .from("responses")
      .select("tester_id, status")
      .in("tester_id", testers.map((t) => t.id))
      .in("checklist_item_id", itemIds)

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

    return NextResponse.json({ testers: testerProgress }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    })
  } catch (err) {
    console.error("Progress API - unexpected error:", err)
    return NextResponse.json({ error: "Internal server error", debug: String(err) }, { status: 500 })
  }
}
