"use client"

import { useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
const ACCEPT = ALLOWED_TYPES.join(",")

export function ViewSampleField({
  value,
  onChange,
  projectId,
  checklistItemId,
}: {
  value: string
  onChange: (url: string) => void
  projectId: string
  checklistItemId?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingName, setUploadingName] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the native input so picking the same file again re-fires onChange
    e.target.value = ""
    // User cancelled the picker — DO NOT clear the existing URL
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large")
      return
    }

    setUploading(true)
    setUploadingName(file.name)
    try {
      const res = await fetch("/api/admin/checklist-samples/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          projectId,
          checklistItemId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(
          data.error === "File too large" ? "File too large" : "Upload failed"
        )
        return
      }

      const { signedUrl, path } = await res.json()

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putRes.ok) {
        toast.error("Upload failed")
        return
      }

      const supabase = createClient()
      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(path)
      onChange(urlData.publicUrl)
      toast.success("File uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      setUploadingName(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">Link to Sample / Guide</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/sample-screenshot.png"
            className="pl-9"
          />
          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          {uploading ? "Uploading..." : "Upload file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      {uploading && uploadingName && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading {uploadingName}...
        </p>
      )}
      <p className="text-xs text-gray-400">
        Max file size: 50MB. Supported: images (PNG, JPG, GIF, WebP) and videos
        (MP4, MOV, WebM)
      </p>
    </div>
  )
}
