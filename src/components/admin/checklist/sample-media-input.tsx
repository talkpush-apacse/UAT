"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clipboard, ImageIcon, Upload, X } from "lucide-react"

export const SAMPLE_MAX_FILE_SIZE = 10 * 1024 * 1024

export const SAMPLE_ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])

const ACCEPT_STRING = ".png,.jpg,.jpeg,.gif,.webp"
const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp)(\?.*)?$/i

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function validateSampleFile(file: File): string | null {
  if (!SAMPLE_ALLOWED_MIME_TYPES.has(file.type)) {
    return "Only PNG, JPG, GIF, and WEBP files are allowed"
  }

  if (file.size > SAMPLE_MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10MB"
  }

  return null
}

function isPreviewableImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  try {
    const url = new URL(trimmed)
    return (url.protocol === "http:" || url.protocol === "https:") && IMAGE_URL_PATTERN.test(url.pathname)
  } catch {
    return false
  }
}

export function SampleMediaInput({
  value,
  onValueChange,
  pendingFile,
  onPendingFileChange,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  pendingFile: File | null
  onPendingFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(pendingFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [pendingFile])

  const selectFile = (file: File) => {
    const validationError = validateSampleFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onPendingFileChange(file)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) selectFile(file)
    event.target.value = ""
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData?.items || [])
      .find((item) => item.kind === "file")
      ?.getAsFile()

    if (!file) return

    event.preventDefault()
    const name = file.name && file.name !== "image.png" ? file.name : `sample-${Date.now()}.png`
    selectFile(name !== file.name ? new File([file], name, { type: file.type }) : file)
  }

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (pendingFile) onPendingFileChange(null)
    onValueChange(event.target.value)
  }

  const handleRemove = () => {
    setError(null)
    if (pendingFile) {
      onPendingFileChange(null)
      return
    }

    onValueChange("")
  }

  const currentPreviewUrl = previewUrl ?? (isPreviewableImageUrl(value) ? value.trim() : null)
  const hasSample = !!pendingFile || !!value.trim()

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Link to Sample / Guide</Label>
        <div className="relative">
          <Input
            type="url"
            value={value}
            onChange={handleUrlChange}
            placeholder="https://example.com/sample-screenshot.png"
            className="pl-9"
            disabled={disabled}
          />
          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <p className="text-xs text-gray-400">
          Keep using links for videos, Google Drive, Descript, or external guides.
        </p>
      </div>

      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload or paste a sample image"
        onPaste={disabled ? undefined : handlePaste}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-3 transition-colors ${
          disabled
            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
            : "cursor-pointer border-gray-200 bg-gray-50 hover:border-brand-sage-lighter hover:bg-brand-sage-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-lighter"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <Upload className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-600">
              Click to upload or paste a screenshot/GIF
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              PNG, JPG, GIF, WEBP · Max 10MB · uploads when you save
            </p>
          </div>
        </div>
      </div>

      {pendingFile && (
        <div className="flex items-center gap-1.5 text-xs text-brand-sage-darker">
          <Clipboard className="h-3.5 w-3.5" />
          <span className="truncate">
            {pendingFile.name} ({formatFileSize(pendingFile.size)}) will replace the sample on save.
          </span>
        </div>
      )}

      {currentPreviewUrl && (
        <div className="rounded-lg border border-gray-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPreviewUrl}
            alt="Sample preview"
            className="max-h-52 w-full rounded-md object-contain"
          />
        </div>
      )}

      {hasSample && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={disabled}
          className="h-8 px-2 text-xs text-gray-500 hover:text-red-600"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          {pendingFile ? "Remove selected image" : "Clear sample"}
        </Button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
