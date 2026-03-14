"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { duplicateProject, deleteProject } from "@/lib/actions/projects"
import { toast } from "sonner"
import { MoreHorizontal, Copy, Trash2, Loader2 } from "lucide-react"

/**
 * P4 — ⋯ More actions dropdown.
 * Consolidates Duplicate and Delete behind a single icon button to reduce
 * the prominence of destructive actions in the project detail header.
 * P5 — Duplicate flow shows a rename dialog before creating the copy.
 */
export default function MoreActionsDropdown({
  projectId,
  slug,
  companyName,
  title,
}: {
  projectId: string
  slug: string
  companyName: string
  title?: string | null
}) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameTitle, setRenameTitle] = useState("")

  const openRenameDialog = () => {
    const defaultTitle = title ? `${title} (Copy)` : `${companyName} (Copy)`
    setRenameTitle(defaultTitle)
    setShowRenameDialog(true)
  }

  const handleDuplicate = async () => {
    setShowRenameDialog(false)
    setDuplicating(true)
    const result = await duplicateProject(projectId, slug, renameTitle.trim() || undefined)
    setDuplicating(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.newSlug) {
      toast.success("Project duplicated")
      router.push(`/admin/projects/${result.newSlug}`)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteProject(projectId)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Project deleted")
      router.push("/admin")
    }
  }

  const busy = duplicating || deleting

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            className="text-gray-600 border-gray-200 hover:bg-gray-50 px-2"
            aria-label="More actions"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={openRenameDialog}
            className="gap-2 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename dialog — shown before duplicating so the copy gets a meaningful title */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
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
              onKeyDown={(e) => { if (e.key === "Enter") handleDuplicate() }}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!renameTitle.trim()}>
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog — triggered from dropdown, not inline */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{companyName}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its checklist
              steps, testers, responses, attachments, and sign-offs. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
