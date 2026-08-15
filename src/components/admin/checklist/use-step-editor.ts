"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateChecklistItem } from "@/lib/actions/checklist"
import { type ChecklistItem, isPhaseHeader } from "./types"
import type { Actor } from "@/lib/constants"
import { useSampleUpload } from "./use-sample-upload"

/**
 * Encapsulates edit-mode state and save/cancel logic for a single checklist
 * step or section header card, including sample-file-then-save sequencing.
 */
export function useStepEditor(
  item: ChecklistItem,
  slug: string,
  onUpdate: (item: ChecklistItem) => void
) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item)
  const [saving, setSaving] = useState(false)

  const isHeader = isPhaseHeader(item)
  const { pendingSampleFile, setPendingSampleFile, uploadSampleFile } =
    useSampleUpload(item.project_id, item.id)

  const startEditing = () => {
    setEditData(item)
    setPendingSampleFile(null)
    setEditing(true)
  }

  const handleSave = async () => {
    if (saving) return

    setSaving(true)

    try {
      let dataToSave = editData

      if (!isHeader && pendingSampleFile) {
        const publicUrl = await uploadSampleFile(pendingSampleFile)
        dataToSave = { ...editData, view_sample: publicUrl }
        setEditData(dataToSave)
        setPendingSampleFile(null)
      }

      const result = isHeader
        ? await updateChecklistItem(slug, {
            id: item.id,
            itemType: "phase_header",
            action: dataToSave.action,
            tip: dataToSave.tip || "",
            headerLabel: dataToSave.header_label || "",
          })
        : await updateChecklistItem(slug, {
            id: item.id,
            path: dataToSave.path as "Happy" | "Non-Happy" | null,
            actor: dataToSave.actor as Actor,
            action: dataToSave.action,
            viewSample: dataToSave.view_sample || "",
            crmModule: dataToSave.crm_module || "",
            tip: dataToSave.tip || "",
          })

      if (result.error) {
        toast.error(result.error)
      } else {
        onUpdate(dataToSave)
        setEditing(false)
        toast.success(isHeader ? "Section header updated" : "Step updated")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setEditData(item)
    setPendingSampleFile(null)
  }

  return {
    isHeader,
    editing,
    editData,
    setEditData,
    saving,
    pendingSampleFile,
    setPendingSampleFile,
    startEditing,
    handleSave,
    handleCancel,
  }
}
