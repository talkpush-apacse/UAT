import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: { path?: string[] } }
) {
  const storagePath = params.path?.join("/") ?? ""

  if (!storagePath.startsWith("samples/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60 * 60)

  if (error || !data?.signedUrl) {
    console.error("public sample redirect error:", error)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
