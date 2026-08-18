"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Copy, Check, Loader2, ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  title: string | null
  itemCount: number
  created_at: string | null
}

interface SourceProjectGroup {
  company_name: string
  isCurrentClient: boolean
  items: SourceProject[]
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

function projectMatchesSearch(project: SourceProject, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    project.company_name,
    project.title,
    project.slug,
    `${project.itemCount}`,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery))
}

function normalizeForCompare(value: string) {
  return value.trim().toLowerCase()
}

function formatShortDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Caps keep the list scannable once there are dozens of clients/checklists;
// both are bypassed entirely while the user is actively searching.
const MAX_VISIBLE_GROUPS = 6
const MAX_VISIBLE_ROWS_PER_GROUP = 6

import { ACTOR_COLORS as ACTOR_CHIP } from "@/lib/constants"

type DialogStep = "project-select" | "step-select"

interface Props {
  projectId: string
  slug: string
  companyName: string
  disabled?: boolean
  onCopied: (newItems: ChecklistItem[]) => void
}

export function CopyStepsDialog({ projectId, slug, companyName, disabled, onCopied }: Props) {
  // Step 1: project selection
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<SourceProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedId, setSelectedId] = useState<string>("")
  const [projectSearchQuery, setProjectSearchQuery] = useState("")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showEmptyChecklists, setShowEmptyChecklists] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [allGroupsExpanded, setAllGroupsExpanded] = useState(false)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
    setProjectSearchQuery("")
    setDialogStep("project-select")
    setSteps([])
    setSelectedStepIds(new Set())
    setStepsError(null)
    setShowEmptyChecklists(false)
    setExpandedGroups(new Set())
    setAllGroupsExpanded(false)

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
  const filteredProjects = useMemo(
    () => projects.filter((project) => projectMatchesSearch(project, projectSearchQuery)),
    [projects, projectSearchQuery]
  )
  const isSearching = projectSearchQuery.trim().length > 0

  const handleProjectSearchChange = (value: string) => {
    setProjectSearchQuery(value)

    const selected = projects.find((project) => project.id === selectedId)
    if (selected && !projectMatchesSearch(selected, value)) {
      setSelectedId("")
    }
  }

  const emptyChecklistCount = useMemo(
    () => filteredProjects.filter((p) => p.itemCount === 0).length,
    [filteredProjects]
  )

  // Grouped by client, current client first, then alphabetical; each group sorted newest-first
  const projectGroups = useMemo<SourceProjectGroup[]>(() => {
    const base = showEmptyChecklists
      ? filteredProjects
      : filteredProjects.filter((p) => p.itemCount > 0)

    const byClient = new Map<string, SourceProject[]>()
    for (const project of base) {
      const list = byClient.get(project.company_name) ?? []
      list.push(project)
      byClient.set(project.company_name, list)
    }

    const currentClientKey = normalizeForCompare(companyName)

    return Array.from(byClient.entries())
      .map(([company_name, items]) => ({
        company_name,
        isCurrentClient: normalizeForCompare(company_name) === currentClientKey,
        items: [...items].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        }),
      }))
      .sort((a, b) => {
        if (a.isCurrentClient !== b.isCurrentClient) return a.isCurrentClient ? -1 : 1
        return a.company_name.localeCompare(b.company_name)
      })
  }, [filteredProjects, showEmptyChecklists, companyName])

  const visibleGroups = isSearching || allGroupsExpanded
    ? projectGroups
    : projectGroups.slice(0, MAX_VISIBLE_GROUPS)
  const hiddenGroupCount = projectGroups.length - visibleGroups.length

  // Flat, render-order list of every currently-visible row, used for arrow-key navigation
  const flatVisibleProjects = useMemo(() => {
    const flat: SourceProject[] = []
    for (const group of visibleGroups) {
      const expanded = isSearching || expandedGroups.has(group.company_name)
      const rows = expanded ? group.items : group.items.slice(0, MAX_VISIBLE_ROWS_PER_GROUP)
      flat.push(...rows)
    }
    return flat
  }, [visibleGroups, expandedGroups, isSearching])

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (flatVisibleProjects.length === 0) return
    const currentIndex = flatVisibleProjects.findIndex((p) => p.id === selectedId)

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = flatVisibleProjects[Math.min(currentIndex + 1, flatVisibleProjects.length - 1)]
      setSelectedId(next.id)
      rowRefs.current[next.id]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prevIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0)
      const prev = flatVisibleProjects[prevIndex]
      setSelectedId(prev.id)
      rowRefs.current[prev.id]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "Escape") {
      ;(e.currentTarget as HTMLElement).blur()
    }
  }

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
          Copy from UAT Checklist
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copy Steps from Another UAT Checklist</DialogTitle>
          <DialogDescription>
            {dialogStep === "project-select"
              ? "Choose a source UAT checklist to browse its steps."
              : `Select which steps to copy from ${selectedProject?.company_name ?? "this UAT checklist"}. Copied steps will be appended to the end of this UAT checklist.`}
          </DialogDescription>
        </DialogHeader>

        {/* ===== STEP 1: Project selection ===== */}
        {dialogStep === "project-select" && (
          <div className="py-2">
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading UAT checklists…
              </div>
            ) : fetchError ? (
              <p className="text-sm text-red-600 py-2">{fetchError}</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                No other UAT checklists found. Create another UAT checklist first to copy steps from it.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="source-project-search">
                  Source UAT checklist
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="source-project-search"
                    type="search"
                    value={projectSearchQuery}
                    onChange={(e) => handleProjectSearchChange(e.target.value)}
                    placeholder="Search by company, title, or slug..."
                    className="pl-9"
                    aria-label="Search source UAT checklists"
                  />
                </div>

                <div
                  role="listbox"
                  aria-label="Source UAT checklist"
                  tabIndex={0}
                  onKeyDown={handleListKeyDown}
                  className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-200 bg-white
                    focus:outline-none focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker"
                >
                  {flatVisibleProjects.length === 0 ? (
                    <p className="text-sm text-gray-400 p-4 text-center">
                      No matching UAT checklists.
                    </p>
                  ) : (
                    <>
                      {visibleGroups.map((group) => {
                        const expanded = isSearching || expandedGroups.has(group.company_name)
                        const rows = expanded
                          ? group.items
                          : group.items.slice(0, MAX_VISIBLE_ROWS_PER_GROUP)
                        const hiddenInGroup = group.items.length - rows.length
                        if (rows.length === 0) return null

                        return (
                          <div key={group.company_name}>
                            <div className="sticky top-0 z-10 flex items-center gap-2 bg-gray-50 border-b border-gray-100 px-3 py-1.5">
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {group.company_name}
                              </span>
                              {group.isCurrentClient && (
                                <span className="text-[10px] font-medium text-brand-lavender-darker bg-brand-lavender-lightest border border-brand-lavender-lighter rounded-full px-1.5 py-0.5 leading-none">
                                  This client
                                </span>
                              )}
                            </div>
                            {rows.map((project) => {
                              const isSelected = selectedId === project.id
                              const dateLabel = formatShortDate(project.created_at)
                              return (
                                <div
                                  key={project.id}
                                  ref={(el) => {
                                    rowRefs.current[project.id] = el
                                  }}
                                  role="option"
                                  aria-selected={isSelected}
                                  tabIndex={-1}
                                  onClick={() => setSelectedId(project.id)}
                                  className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors ${
                                    isSelected ? "bg-brand-lavender-lightest" : "hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-800 truncate">
                                      {project.title || project.slug}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {project.itemCount} {project.itemCount === 1 ? "step" : "steps"}
                                      {dateLabel ? ` · ${dateLabel}` : ""}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check className="h-4 w-4 flex-shrink-0 text-brand-lavender-darker" />
                                  )}
                                </div>
                              )
                            })}
                            {hiddenInGroup > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroups((prev) => new Set(prev).add(group.company_name))
                                }
                                className="w-full text-left px-3 py-1.5 text-xs font-medium text-brand-sage-darker hover:text-primary transition-colors border-b border-gray-50"
                              >
                                Show {hiddenInGroup} more in {group.company_name}
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {!isSearching && hiddenGroupCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setAllGroupsExpanded(true)}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-brand-sage-darker hover:text-primary transition-colors"
                        >
                          Show {hiddenGroupCount} more {hiddenGroupCount === 1 ? "client" : "clients"}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {isSearching && `Showing ${filteredProjects.length} of ${projects.length} UAT checklists.`}
                  </p>
                  {emptyChecklistCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowEmptyChecklists((prev) => !prev)}
                      className="flex-shrink-0 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showEmptyChecklists
                        ? "Hide checklists with no steps"
                        : `Show ${emptyChecklistCount} checklist${emptyChecklistCount === 1 ? "" : "s"} with no steps`}
                    </button>
                  )}
                </div>

                {selectedProject && selectedProject.itemCount === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    This UAT checklist has no steps to copy.
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
                  This UAT checklist has no steps.
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
