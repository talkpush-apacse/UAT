"use client"

import { useState, useRef, useCallback } from "react"
import { createAnonClient } from "@/lib/supabase/client"
import { Paperclip, FileText, File as FileIcon, X } from "lucide-react"
import { toast } from "sonner"

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

/** Icon for non-image attachments */
function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") {
    return <FileText className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
  }
  if (mimeType.includes("word") || mimeType.includes("document")) {
    return <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
  }
  return <FileIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
}

export default function FileUpload({
  responseId,
  testerId,
  projectId,
  existingAttachments,
}: {
  responseId: string
  testerId: string
  projectId: string
  existingAttachments: AttachmentData[]
}) {
  const [attachments, setAttachments] = useState<AttachmentData[]>(existingAttachments)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload a single file — returns the saved AttachmentData or an error string
  const uploadSingleFile = useCallback(
    async (file: File): Promise<AttachmentData | string> => {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return `${file.name}: unsupported file type`
      }
      if (file.size > MAX_FILE_SIZE) {
        return `${file.name}: exceeds 10MB limit`
      }

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
        return `${file.name}: ${data.error || "upload failed"}`
      }

      const { signedUrl, path } = await res.json()

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        return `${file.name}: upload failed`
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
        return `${file.name}: failed to save record`
      }

      return attachment
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
        if (typeof result === "string") {
          errors.push(result)
        } else {
          newAttachments.push(result)
        }
      })

      setAttachments((prev) => [...prev, ...newAttachments])
      setUploadErrors(errors)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [uploadSingleFile]
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
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
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
              className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-gray-200 text-xs hover:bg-gray-50 transition-colors"
            >
              {att.mime_type.startsWith("image/") ? (
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <span>🖼</span>
                  <span className="max-w-[140px] truncate text-gray-700">{att.file_name}</span>
                </a>
              ) : (
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <AttachmentIcon mimeType={att.mime_type} />
                  <span className="max-w-[140px] truncate text-gray-700">{att.file_name}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDelete(att)}
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none"
                aria-label={`Remove ${att.file_name}`}
              >
                <X className="h-3 w-3" />
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
          group relative rounded-xl border-2 border-dashed px-4 py-3
          flex items-center gap-3 transition-all duration-150 cursor-pointer
          ${uploading
            ? "border-brand-sage-lighter bg-brand-sage-lightest cursor-default"
            : "border-gray-200 bg-gray-50 hover:border-brand-sage-lighter hover:bg-brand-sage-lightest"
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-lighter focus-visible:border-brand-sage-lighter
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

        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 group-hover:border-brand-sage-lighter flex items-center justify-center flex-shrink-0 transition-colors">
          {uploading ? (
            <div className="h-4 w-4 border-2 border-brand-sage-lighter border-t-brand-sage-darker rounded-full animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4 text-gray-400 group-hover:text-brand-sage-darker transition-colors" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 group-hover:text-brand-sage-darker transition-colors leading-tight">
            {uploading ? "Uploading…" : "Click to attach files"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            PNG, JPG, GIF, PDF, DOCX · Max 10MB · or paste a screenshot
          </p>
        </div>
      </div>

      {/* Per-file upload errors */}
      {uploadErrors.length > 0 && (
        <div className="space-y-0.5">
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
