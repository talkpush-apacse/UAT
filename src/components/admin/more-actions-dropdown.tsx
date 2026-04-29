"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { deleteProject } from "@/lib/actions/projects"
import DuplicateProjectDialog from "@/components/admin/duplicate-project-dialog"
import { toast } from "sonner"
import { MoreHorizontal, Copy, Trash2, Loader2, Share2 } from "lucide-react"

/**
 * P4 — ⋯ More actions dropdown.
 * Consolidates Duplicate and Delete behind a single icon button to reduce
 * the prominence of destructive actions in the project detail header.
 * P5 — Duplicate flow shows a rename dialog before creating the copy.
 */
export default function MoreActionsDropdown({
  projectId,
  companyName,
  title,
  slug,
}: {
  projectId: string
  companyName: string
  title?: string | null
  slug: string
}) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharingAnalytics, setSharingAnalytics] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)

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

  const handleShareAnalytics = async () => {
    setSharingAnalytics(true)
    try {
      const res = await fetch(`/api/share-token/${slug}`)
      if (!res.ok) {
        throw new Error("Failed to generate analytics link")
      }

      const { token } = await res.json()
      const url = `${window.location.origin}/share/analytics/${slug}/${token}`
      await navigator.clipboard.writeText(url)
      toast.success("Analytics link copied")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy analytics link")
    } finally {
      setSharingAnalytics(false)
    }
  }

  const busy = duplicating || deleting || sharingAnalytics

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
            onClick={handleShareAnalytics}
            disabled={sharingAnalytics}
            className="gap-2 cursor-pointer"
          >
            {sharingAnalytics ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            Share Analytics
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowRenameDialog(true)}
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

      <DuplicateProjectDialog
        projectId={projectId}
        companyName={companyName}
        title={title}
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        onBusyChange={setDuplicating}
      />

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
