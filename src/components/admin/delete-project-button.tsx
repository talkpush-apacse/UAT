"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteProject } from "@/lib/actions/projects"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

export default function DeleteProjectButton({
  projectId,
  companyName,
}: {
  projectId: string
  companyName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteProject(projectId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Project deleted")
      router.push("/admin")
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete Project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{companyName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this project and all its checklist steps,
            testers, responses, attachments, and sign-offs. This cannot be undone.
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
  )
}
