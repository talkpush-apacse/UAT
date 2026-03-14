import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Lightweight endpoint that returns just enough project metadata
 * for the admin breadcrumb to display real names instead of the slug.
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("projects")
    .select("company_name, title")
    .eq("slug", params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(data, {
    // 60-second private cache — fine for display metadata
    headers: { "Cache-Control": "private, max-age=60" },
  })
}
