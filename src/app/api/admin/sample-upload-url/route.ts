import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"])

function getSafeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileSize, mimeType, projectId, checklistItemId } = body

    if (!fileName || !mimeType || !projectId || !checklistItemId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 })
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType) || !ALLOWED_EXTENSIONS.has(getExtension(fileName))) {
      return NextResponse.json({ error: "Only PNG, JPG, GIF, and WEBP files are allowed" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: checklistItem, error: itemError } = await supabase
      .from("checklist_items")
      .select("id, item_type")
      .eq("id", checklistItemId)
      .eq("project_id", projectId)
      .single()

    if (itemError || !checklistItem) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 })
    }

    if (checklistItem.item_type === "phase_header") {
      return NextResponse.json({ error: "Samples can only be attached to checklist steps" }, { status: 400 })
    }

    const uniqueId = crypto.randomUUID()
    const safeFileName = getSafeFileName(fileName)
    const path = `samples/${projectId}/${checklistItemId}/${uniqueId}-${safeFileName}`

    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUploadUrl(path)

    if (error) {
      console.error("create sample upload URL error:", error)
      return NextResponse.json({ error: "Unable to create upload URL" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path,
      publicUrl: urlData.publicUrl,
    })
  } catch (error) {
    console.error("sample-upload-url error:", error)
    return NextResponse.json({ error: "Unable to prepare sample upload" }, { status: 500 })
  }
}
