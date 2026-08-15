"use client"

import { useState } from "react"
import { validateSampleFile } from "./sample-media-input"

/**
 * Validates and uploads a step's sample/screenshot file via a signed
 * Supabase Storage URL, returning the public URL to save on the item.
 */
export function useSampleUpload(projectId: string, checklistItemId: string) {
  const [pendingSampleFile, setPendingSampleFile] = useState<File | null>(null)

  const uploadSampleFile = async (file: File): Promise<string> => {
    const validationError = validateSampleFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    const response = await fetch("/api/admin/sample-upload-url", {
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

    const data = await response.json().catch(() => ({
      error: "Unable to prepare sample upload",
    })) as {
      signedUrl?: string
      publicUrl?: string
      error?: string
    }

    if (!response.ok || !data.signedUrl || !data.publicUrl) {
      throw new Error(data.error || "Unable to prepare sample upload")
    }

    const uploadResponse = await fetch(data.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error("Unable to upload sample image")
    }

    return data.publicUrl
  }

  return { pendingSampleFile, setPendingSampleFile, uploadSampleFile }
}
