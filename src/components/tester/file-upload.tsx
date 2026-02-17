"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Paperclip } from "lucide-react"

interface AttachmentData {
  id: string
  response_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]

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
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File type not supported. Use JPEG, PNG, GIF, WebP, MP4, WebM, or MOV.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 10MB.")
      return
    }

    setUploading(true)

    try {
      // Get signed upload URL
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
        const data = await res.json()
        setError(data.error || "Failed to get upload URL")
        setUploading(false)
        return
      }

      const { signedUrl, token, path } = await res.json()

      // Upload file directly to Supabase Storage
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(path, token, file)

      if (uploadError) {
        setError("Upload failed: " + uploadError.message)
        setUploading(false)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(path)

      // Save attachment record
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
        setError("Failed to save attachment record")
        setUploading(false)
        return
      }

      setAttachments((prev) => [...prev, attachment])
    } catch {
      setError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div>
      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-xs hover:bg-gray-100 transition-colors"
            >
              {att.mime_type.startsWith("image/") ? "🖼" : "🎬"}
              <span className="max-w-[120px] truncate text-gray-700">{att.file_name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-3 w-3 mr-1" />
          {uploading ? "Uploading..." : "Attach File"}
        </Button>
        <span className="text-xs text-gray-400">Max 10MB</span>
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
