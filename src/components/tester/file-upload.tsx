"use client"

import { useState, useRef, useCallback } from "react"
import { createAnonClient } from "@/lib/supabase/client"
import { Paperclip, FileText, File as FileIcon, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { fileKindFor, trackEvent, type ViewMode } from "@/lib/mixpanel"

interface AttachmentData {
  id: string
  response_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

const ACCEPT_STRING = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx"

type UploadStage = "file_type" | "file_size" | "upload_url" | "storage" | "save_record" | "network"
type UploadFailure = { error: string; stage: UploadStage; mimeType: string }

/** Only http/https URLs are safe to render as a clickable link */
function isSafeAttachmentUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

/** Icon for an attachment chip */
function AttachmentIcon({ mimeType }: { mimeType: string }) {
  const cls = "h-4 w-4 flex-shrink-0 text-primary"
  if (mimeType.startsWith("image/")) return <ImageIcon className={cls} />
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType.includes("document")) {
    return <FileText className={cls} />
  }
  return <FileIcon className={cls} />
}

export default function FileUpload({
  responseId,
  testerId,
  projectId,
  existingAttachments,
  onAttachmentsChange,
  trackingContext,
}: {
  responseId: string
  testerId: string
  projectId: string
  existingAttachments: AttachmentData[]
  onAttachmentsChange?: (attachments: AttachmentData[]) => void
  trackingContext: { project_slug: string; step_number: number; view_mode: ViewMode }
}) {
  const [attachments, setAttachments] = useState<AttachmentData[]>(existingAttachments)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const trackingRef = useRef(trackingContext)
  trackingRef.current = trackingContext

  // Upload a single file — returns the saved AttachmentData, or the error to
  // show plus which stage failed (the stage, not the message, goes to analytics)
  const uploadSingleFile = useCallback(
    async (file: File): Promise<AttachmentData | UploadFailure> => {
      const fail = (error: string, stage: UploadStage): UploadFailure => ({ error, stage, mimeType: file.type })

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return fail(`${file.name}: unsupported file type. Use an image, PDF, or Word file.`, "file_type")
      }
      if (file.size > MAX_FILE_SIZE) {
        return fail(`${file.name}: exceeds 10MB limit`, "file_size")
      }

      try {
        const res = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            responseId,
            testerId,
            projectId,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Upload failed" }))
          return fail(`${file.name}: ${data.error || "upload failed"}`, "upload_url")
        }

        const { signedUrl, path } = await res.json()

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        })

        if (!uploadRes.ok) {
          return fail(`${file.name}: upload failed`, "storage")
        }

        const supabase = createAnonClient()
        const { data: urlData } = supabase.storage
          .from("attachments")
          .getPublicUrl(path)

        const { data: attachment, error: dbError } = await supabase
          .from("attachments")
          .insert({
            response_id: responseId,
            file_name: file.name,
            file_url: urlData.publicUrl || signedUrl,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single()

        if (dbError) {
          return fail(`${file.name}: failed to save record`, "save_record")
        }

        return attachment
      } catch {
        // fetch() rejects on connection loss — previously this left the
        // whole batch stuck on "Uploading…"
        return fail(`${file.name}: upload failed — check your connection`, "network")
      }
    },
    [responseId, testerId, projectId]
  )

  // Handle an array of files — upload in parallel, collect successes and errors
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setUploading(true)
      setUploadErrors([])

      const results = await Promise.all(files.map(uploadSingleFile))

      const newAttachments: AttachmentData[] = []
      const errors: string[] = []
      results.forEach((result) => {
        if ("stage" in result) {
          errors.push(result.error)
          trackEvent("Attachment Upload Failed", {
            ...trackingRef.current,
            stage: result.stage,
            file_kind: fileKindFor(result.mimeType),
            file_count: files.length,
          })
        } else {
          newAttachments.push(result)
        }
      })

      setAttachments((prev) => {
        const next = [...prev, ...newAttachments]
        onAttachmentsChange?.(next)
        return next
      })
      setUploadErrors(errors)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [uploadSingleFile, onAttachmentsChange]
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await handleFiles(files)
  }

  // Clipboard paste — images only (PDFs/DOCX not reliably supported by browsers)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData?.items || [])
      const files = items
        .filter((item) => item.kind === "file")
        .map((item) => {
          const file = item.getAsFile()
          if (!file) return null
          // Generate a filename for unnamed screenshots
          const name =
            file.name && file.name !== "image.png" && file.name !== ""
              ? file.name
              : `screenshot-${Date.now()}.png`
          return name !== file.name
            ? new File([file], name, { type: file.type })
            : file
        })
        .filter((f): f is File => f !== null)

      if (files.length > 0) {
        e.preventDefault()
        handleFiles(files)
      }
    },
    [handleFiles]
  )

  const handleDelete = async (attachment: AttachmentData) => {
    const res = await fetch("/api/delete-attachment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentId: attachment.id, testerId }),
    })

    if (res.ok) {
      setAttachments((prev) => {
        const next = prev.filter((a) => a.id !== attachment.id)
        onAttachmentsChange?.(next)
        return next
      })
    } else {
      toast.error("Failed to remove attachment")
    }
  }

  return (
    <div className="space-y-2">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center gap-1.5 rounded-lg border-2 border-primary bg-white px-2.5 py-1.5 text-sm"
            >
              {isSafeAttachmentUrl(att.file_url) ? (
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <AttachmentIcon mimeType={att.mime_type} />
                  <span className="max-w-[160px] truncate font-bold text-primary">{att.file_name}</span>
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-600" title="This file's link couldn't be verified as safe to open">
                  <AttachmentIcon mimeType={att.mime_type} />
                  <span className="max-w-[140px] truncate">{att.file_name}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(att)}
                className="-my-1 -mr-1.5 ml-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-red-50 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label={`Remove ${att.file_name}`}
                data-track="Remove attachment"
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        tabIndex={0}
        role="button"
        aria-label="Attach files or paste a screenshot"
        onPaste={handlePaste}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
        }}
        className={`
          group relative flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-primary px-3 py-3 transition-colors
          ${uploading ? "cursor-default bg-secondary" : "bg-white hover:bg-secondary"}
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        ) : (
          <Paperclip className="h-5 w-5 flex-shrink-0 text-primary" />
        )}

        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight text-primary">
            {uploading ? "Uploading…" : "Add screenshot or file"}
          </p>
          <p className="mt-0.5 text-sm font-medium text-gray-700">Max 10MB. Pasting a screenshot works too.</p>
        </div>
      </div>

      {/* Per-file upload errors */}
      {uploadErrors.length > 0 && (
        <div className="space-y-0.5">
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-sm font-bold text-red-700">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
