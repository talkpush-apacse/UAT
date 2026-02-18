"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { duplicateProject } from "@/lib/actions/projects"
import { toast } from "sonner"
import { Copy, Loader2 } from "lucide-react"

export default function DuplicateProjectButton({
  projectId,
  slug,
}: {
  projectId: string
  slug: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDuplicate = async () => {
    setLoading(true)
    const result = await duplicateProject(projectId, slug)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.newSlug) {
      toast.success("Project duplicated")
      router.push(`/admin/projects/${result.newSlug}`)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDuplicate}
      disabled={loading}
      className="text-gray-600 border-gray-200 hover:bg-gray-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Copy className="h-3.5 w-3.5 mr-1.5" />
      )}
      {loading ? "Duplicating…" : "Duplicate Project"}
    </Button>
  )
}
