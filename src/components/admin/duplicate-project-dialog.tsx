"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { duplicateProject } from "@/lib/actions/projects"
import { toast } from "sonner"

interface DuplicateProjectDialogProps {
  projectId: string
  companyName: string
  title?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBusyChange?: (busy: boolean) => void
}

function getDefaultDuplicateTitle(companyName: string, title?: string | null) {
  return title ? `${title} (Copy)` : `${companyName} (Copy)`
}

export default function DuplicateProjectDialog({
  projectId,
  companyName,
  title,
  open,
  onOpenChange,
  onBusyChange,
}: DuplicateProjectDialogProps) {
  const router = useRouter()
  const [renameTitle, setRenameTitle] = useState("")

  useEffect(() => {
    if (open) {
      setRenameTitle(getDefaultDuplicateTitle(companyName, title))
    }
  }, [companyName, open, title])

  const handleDuplicate = async () => {
    const trimmedTitle = renameTitle.trim()
    if (!trimmedTitle) return

    onOpenChange(false)
    onBusyChange?.(true)
    const result = await duplicateProject(projectId, trimmedTitle)
    onBusyChange?.(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.newSlug) {
      toast.success("Project duplicated")
      router.push(`/admin/projects/${result.newSlug}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplicate Project</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            New project title
          </label>
          <Input
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDuplicate()
            }}
            className="w-full"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={!renameTitle.trim()}>
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
