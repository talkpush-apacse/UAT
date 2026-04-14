import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.json()
  const { attachmentId, testerId } = body

  if (!attachmentId || !testerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify ownership: the attachment's response must belong to the claimed tester.
  // Two-step check to avoid complex join syntax.
  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("id, response_id, file_url")
    .eq("id", attachmentId)
    .single()

  if (fetchError || !attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: response, error: responseError } = await supabase
    .from("responses")
    .select("id")
    .eq("id", attachment.response_id)
    .eq("tester_id", testerId)
    .single()

  if (responseError || !response) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Attempt to delete the file from storage (best-effort, non-blocking)
  try {
    const bucketPrefix = "/public/attachments/"
    const urlParts = attachment.file_url?.split(bucketPrefix)
    if (urlParts && urlParts.length > 1) {
      await supabase.storage.from("attachments").remove([urlParts[1]])
    }
  } catch {
    // Storage deletion is best-effort — proceed regardless
  }

  // Delete the DB record
  const { error: deleteError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
