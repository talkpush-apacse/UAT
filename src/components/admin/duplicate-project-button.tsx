"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import DuplicateProjectDialog from "@/components/admin/duplicate-project-dialog"
import { Copy, Loader2 } from "lucide-react"

export default function DuplicateProjectButton({
  projectId,
  companyName,
  title,
}: {
  projectId: string
  companyName: string
  title?: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-gray-600 border-gray-200 hover:bg-gray-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5 mr-1.5" />
        )}
        {loading ? "Duplicating..." : "Duplicate Project"}
      </Button>
      <DuplicateProjectDialog
        projectId={projectId}
        companyName={companyName}
        title={title}
        open={open}
        onOpenChange={setOpen}
        onBusyChange={setLoading}
      />
    </>
  )
}
