import { createAdminClient } from "@/lib/supabase/admin"

// Base64 inflates size by ~33%; this keeps inlined content well under typical
// MCP client/context limits. Real-world attachments today top out around
// 550KB, so this is a generous ceiling rather than a tight fit.
const MAX_INLINE_BYTES = 8 * 1024 * 1024

const ATTACHMENTS_BUCKET_MARKER = "/storage/v1/object/public/attachments/"

export interface AttachmentRow {
  id: string
  response_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

export type AttachmentContentBlock =
  | { type: "image"; data: string; mimeType: string }
  | { type: "text"; text: string }

export interface AttachmentContentResult {
  attachment: {
    id: string
    file_name: string
    mime_type: string
    file_size: number
  }
  content: AttachmentContentBlock[]
  note?: string
}

function extractStoragePath(fileUrl: string): string | null {
  const markerIndex = fileUrl.indexOf(ATTACHMENTS_BUCKET_MARKER)
  if (markerIndex === -1) return null
  return decodeURIComponent(fileUrl.slice(markerIndex + ATTACHMENTS_BUCKET_MARKER.length))
}

export async function getAttachmentById(attachmentId: string): Promise<AttachmentRow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("attachments")
    .select("id, response_id, file_name, file_url, file_size, mime_type")
    .eq("id", attachmentId)
    .single()

  if (error || !data) throw new Error(`Attachment not found: ${attachmentId}`)
  return data
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

// Testers often paste a screenshot straight into a blank Word doc (observed
// in production data — e.g. "Screenshot.docx" with no text runs, just one
// embedded image). extractRawText returns "" for those, so fall back to
// pulling the embedded images out and returning them as image content.
async function extractDocxImages(
  buffer: Buffer
): Promise<{ data: string; mimeType: string }[]> {
  const mammoth = await import("mammoth")
  const images: { data: string; mimeType: string }[] = []

  await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (element) => {
        const base64 = await element.readAsBase64String()
        images.push({ data: base64, mimeType: element.contentType })
        return { src: "" }
      }),
    }
  )

  return images
}

export async function buildAttachmentContent(
  attachment: AttachmentRow
): Promise<AttachmentContentResult> {
  const meta = {
    id: attachment.id,
    file_name: attachment.file_name,
    mime_type: attachment.mime_type,
    file_size: attachment.file_size,
  }

  if (attachment.file_size > MAX_INLINE_BYTES) {
    return {
      attachment: meta,
      content: [],
      note: `File is ${attachment.file_size} bytes, over the ${MAX_INLINE_BYTES}-byte inline limit. Use file_url instead: ${attachment.file_url}`,
    }
  }

  const storagePath = extractStoragePath(attachment.file_url)
  if (!storagePath) {
    return {
      attachment: meta,
      content: [],
      note: `Could not resolve a storage path from file_url. Use file_url directly: ${attachment.file_url}`,
    }
  }

  const supabase = createAdminClient()
  const { data: blob, error } = await supabase.storage
    .from("attachments")
    .download(storagePath)

  if (error || !blob) {
    throw new Error(`Failed to download attachment from storage: ${error?.message ?? "unknown error"}`)
  }

  const buffer = Buffer.from(await blob.arrayBuffer())

  if (attachment.mime_type.startsWith("image/")) {
    return {
      attachment: meta,
      content: [
        { type: "image", data: buffer.toString("base64"), mimeType: attachment.mime_type },
      ],
    }
  }

  if (attachment.mime_type === "application/pdf") {
    const text = await extractPdfText(buffer)
    return { attachment: meta, content: [{ type: "text", text }] }
  }

  if (
    attachment.mime_type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = await extractDocxText(buffer)
    if (text.trim().length > 0) {
      return { attachment: meta, content: [{ type: "text", text }] }
    }

    const images = await extractDocxImages(buffer)
    if (images.length > 0) {
      return {
        attachment: meta,
        content: images.map((img) => ({
          type: "image" as const,
          data: img.data,
          mimeType: img.mimeType,
        })),
        note: "Document had no extractable text — returning its embedded image(s) instead.",
      }
    }

    return {
      attachment: meta,
      content: [],
      note: "Document has no extractable text or embedded images.",
    }
  }

  // Legacy .doc (application/msword), video, or anything else we don't
  // extract text/images from — hand back the link so the caller can still
  // reach the file.
  return {
    attachment: meta,
    content: [],
    note: `Content extraction isn't supported for ${attachment.mime_type}. File URL: ${attachment.file_url}`,
  }
}
