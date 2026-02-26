"use client"

import { useState, useEffect } from "react"
import { Copy, ChevronDown, Loader2, ArrowLeft } from "lucide-react"
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
import {
  listProjectsForCopy,
  copyStepsFromProject,
  getProjectStepsForCopy,
} from "@/lib/actions/checklist"
import type { StepPreview } from "@/lib/actions/checklist"
import { toast } from "sonner"
import type { ChecklistItem } from "./types"

interface SourceProject {
  id: string
  slug: string
  company_name: string
  itemCount: number
}

interface StepGroup {
  actor: string
  path: string | null
  steps: StepPreview[]
}

/** Group consecutive steps that share the same actor + path combination */
function groupSteps(steps: StepPreview[]): StepGroup[] {
  const groups: StepGroup[] = []
  for (const step of steps) {
    const last = groups[groups.length - 1]
    if (!last || last.actor !== step.actor || last.path !== step.path) {
      groups.push({ actor: step.actor, path: step.path, steps: [step] })
    } else {
      last.steps.push(step)
    }
  }
  return groups
}

const ACTOR_CHIP: Record<string, string> = {
  Candidate: "bg-sky-50 text-sky-800 border-sky-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
  Recruiter: "bg-violet-50 text-violet-800 border-violet-200",
}

type DialogStep = "project-select" | "step-select"

interface Props {
  projectId: string
  slug: string
  disabled?: boolean
  onCopied: (newItems: ChecklistItem[]) => void
}

export function CopyStepsDialog({ projectId, slug, disabled, onCopied }: Props) {
  // Step 1: project selection
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<SourceProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedId, setSelectedId] = useState<string>("")
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Step 2: step selection
  const [dialogStep, setDialogStep] = useState<DialogStep>("project-select")
  const [steps, setSteps] = useState<StepPreview[]>([])
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())

  // Copy
  const [copying, setCopying] = useState(false)

  // Reset all state and load project list when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingProjects(true)
    setFetchError(null)
    setSelectedId("")
    setDialogStep("project-select")
    setSteps([])
    setSelectedStepIds(new Set())
    setStepsError(null)

    listProjectsForCopy(projectId).then((result) => {
      setLoadingProjects(false)
      if (result.error) {
        setFetchError(result.error)
      } else {
        setProjects(result.projects || [])
      }
    })
  }, [open, projectId])

  const selectedProject = projects.find((p) => p.id === selectedId)

  /* ---- Step 1 → Step 2: load step list ---- */
  const handleLoadSteps = async () => {
    if (!selectedId) return
    setLoadingSteps(true)
    setStepsError(null)
    setSteps([])
    setSelectedStepIds(new Set())

    const result = await getProjectStepsForCopy(selectedId)
    setLoadingSteps(false)

    if (result.error) {
      setStepsError(result.error)
      return
    }

    setSteps(result.steps || [])
    setDialogStep("step-select")
  }

  /* ---- Checkbox helpers ---- */
  const handleSelectAll = () => setSelectedStepIds(new Set(steps.map((s) => s.id)))
  const handleDeselectAll = () => setSelectedStepIds(new Set())
  const handleToggleStep = (id: string) => {
    setSelectedStepIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /* ---- Copy selected steps ---- */
  const handleCopy = async () => {
    if (selectedStepIds.size === 0) return
    setCopying(true)

    const result = await copyStepsFromProject(
      projectId,
      slug,
      selectedId,
      Array.from(selectedStepIds)
    )

    setCopying(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      `${result.addedCount} ${result.addedCount === 1 ? "step" : "steps"} copied`
    )
    setOpen(false)
    onCopied([])
  }

  const stepGroups = groupSteps(steps)

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

      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copy Steps from Another Project</DialogTitle>
          <DialogDescription>
            {dialogStep === "project-select"
              ? "Choose a source project to browse its steps."
              : `Select which steps to copy from ${selectedProject?.company_name ?? "this project"}. Copied steps will be appended to the end of this checklist.`}
          </DialogDescription>
        </DialogHeader>

        {/* ===== STEP 1: Project selection ===== */}
        {dialogStep === "project-select" && (
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
                      focus:outline-none focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker
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
                    {selectedProject.itemCount} {selectedProject.itemCount === 1 ? "step" : "steps"} available — you can select which ones to copy.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: Step selection ===== */}
        {dialogStep === "step-select" && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 py-2">
            {/* Controls bar */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{selectedStepIds.size}</span>
                {" "}of{" "}
                <span className="font-medium text-gray-800">{steps.length}</span>
                {" "}steps selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-medium text-brand-sage-darker hover:text-primary transition-colors"
                >
                  Select All
                </button>
                <span className="text-gray-300 select-none">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Scrollable step list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 min-h-[200px] max-h-[400px]">
              {loadingSteps ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading steps…
                </div>
              ) : stepsError ? (
                <p className="text-sm text-red-600 p-4">{stepsError}</p>
              ) : steps.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">
                  This project has no steps.
                </p>
              ) : (
                stepGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Group header — sticky within the scrollable container */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border leading-none ${ACTOR_CHIP[group.actor] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {group.actor}
                      </span>
                      {group.path && (
                        <span className="text-xs text-gray-400">{group.path}</span>
                      )}
                    </div>

                    {/* Step rows */}
                    {group.steps.map((step) => (
                      <label
                        key={step.id}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStepIds.has(step.id)}
                          onChange={() => handleToggleStep(step.id)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-brand-sage-darker accent-brand-sage-darker cursor-pointer"
                        />
                        {/* Step number badge */}
                        <span className="flex-shrink-0 w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center">
                          {step.step_number}
                        </span>
                        {/* Action text + crm_module */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                            {step.action}
                          </p>
                          {step.crm_module && (
                            <span className="text-xs text-gray-400 mt-0.5 block">
                              {step.crm_module}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===== FOOTER — conditional by dialog step ===== */}
        <DialogFooter className="flex-shrink-0">
          {dialogStep === "project-select" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loadingProjects || loadingSteps}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoadSteps}
                disabled={
                  !selectedId ||
                  loadingSteps ||
                  (selectedProject?.itemCount ?? 0) === 0
                }
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {loadingSteps ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load Steps →"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setDialogStep("project-select")}
                disabled={copying}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={handleCopy}
                disabled={selectedStepIds.size === 0 || copying}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {copying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Copying…
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy {selectedStepIds.size} {selectedStepIds.size === 1 ? "Step" : "Steps"}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
