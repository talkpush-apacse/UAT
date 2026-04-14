import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]

export async function POST(request: Request) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    fileName?: string
    fileSize?: number
    mimeType?: string
    projectId?: string
    checklistItemId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { fileName, fileSize, mimeType, projectId, checklistItemId } = body

  if (!fileName || typeof fileSize !== "number" || !mimeType || !projectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 })
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)
  const itemSegment = checklistItemId || "new"
  const uniqueId = crypto.randomUUID().slice(0, 8)
  const path = `checklist-samples/${projectId}/${itemSegment}-${Date.now()}-${uniqueId}-${safeFileName}`

  const supabase = createAdminClient()
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
