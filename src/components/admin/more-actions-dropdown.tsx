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
import { duplicateProject, deleteProject } from "@/lib/actions/projects"
import { toast } from "sonner"
import { MoreHorizontal, Copy, Trash2, Loader2 } from "lucide-react"

/**
 * P4 — ⋯ More actions dropdown.
 * Consolidates Duplicate and Delete behind a single icon button to reduce
 * the prominence of destructive actions in the project detail header.
 */
export default function MoreActionsDropdown({
  projectId,
  slug,
  companyName,
}: {
  projectId: string
  slug: string
  companyName: string
}) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDuplicate = async () => {
    setDuplicating(true)
    const result = await duplicateProject(projectId, slug)
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
            onClick={handleDuplicate}
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
