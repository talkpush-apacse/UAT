"use client"

import { useState, useEffect } from "react"
import { Copy, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { listProjectsForCopy, copyStepsFromProject } from "@/lib/actions/checklist"
import { toast } from "sonner"
import type { ChecklistItem } from "./types"

interface SourceProject {
  id: string
  slug: string
  company_name: string
  itemCount: number
}

interface Props {
  projectId: string
  slug: string
  disabled?: boolean
  onCopied: (newItems: ChecklistItem[]) => void
}

export function CopyStepsDialog({ projectId, slug, disabled, onCopied }: Props) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<SourceProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedId, setSelectedId] = useState<string>("")
  const [copying, setCopying] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Load the project list when the dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingProjects(true)
    setFetchError(null)
    setSelectedId("")

    listProjectsForCopy(projectId).then((result) => {
      setLoadingProjects(false)
      if (result.error) {
        setFetchError(result.error)
      } else {
        setProjects(result.projects || [])
      }
    })
  }, [open, projectId])

  const handleCopy = async () => {
    if (!selectedId) return
    setCopying(true)

    const result = await copyStepsFromProject(projectId, slug, selectedId)

    setCopying(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    // The server action appended the steps — we need the updated list.
    // We re-fetch by closing the dialog and letting the parent refresh via
    // a full page reload trigger (simplest approach that avoids prop-drilling
    // the entire refetch logic).
    toast.success(`${result.addedCount} ${result.addedCount === 1 ? "step" : "steps"} copied`)
    setOpen(false)
    // Signal the parent that items were added so it can reload from the server
    onCopied([])
  }

  const selectedProject = projects.find((p) => p.id === selectedId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="text-gray-600 border-gray-200 hover:bg-gray-50"
        >
          <Copy className="h-4 w-4 mr-1.5" />
          Copy from Project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Steps from Another Project</DialogTitle>
          <DialogDescription>
            All steps from the selected project will be appended to the end of this checklist. Existing steps are not affected.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading projects…
            </div>
          ) : fetchError ? (
            <p className="text-sm text-red-600 py-2">{fetchError}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              No other projects found. Create another project first to copy steps from it.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="source-project">
                Source project
              </label>
              <div className="relative">
                <select
                  id="source-project"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm text-gray-800
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">— Select a project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company_name} ({p.itemCount} {p.itemCount === 1 ? "step" : "steps"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {selectedProject && selectedProject.itemCount === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  This project has no steps to copy.
                </p>
              )}

              {selectedProject && selectedProject.itemCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProject.itemCount} {selectedProject.itemCount === 1 ? "step" : "steps"} will be appended to this checklist.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={copying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={
              !selectedId ||
              copying ||
              (selectedProject?.itemCount ?? 0) === 0
            }
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {copying ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Copying…
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Steps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
