import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.json()
  const { fileName, fileSize, mimeType, responseId, testerId, projectId } = body

  if (!fileName || !mimeType || !responseId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (fileSize > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]

  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const uniqueId = crypto.randomUUID()
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${projectId}/${testerId}/${responseId}/${uniqueId}-${safeFileName}`

  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUploadUrl(path)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  })
}
