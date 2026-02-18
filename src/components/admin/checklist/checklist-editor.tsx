"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
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
import {
  deleteChecklistItem,
  reorderChecklistItems,
  duplicateChecklistItem,
  bulkDeleteChecklistItems,
} from "@/lib/actions/checklist"
import { toast } from "sonner"
import { Plus, FileText, Trash2, CheckSquare } from "lucide-react"
import { type ChecklistItem, renumberItems } from "./types"
import { SortableStepCard } from "./step-card"
import { AddStepForm } from "./add-step-form"

/* ------------------------------------------------------------------ */
/*  ChecklistEditor (default export)                                   */
/* ------------------------------------------------------------------ */

export default function ChecklistEditor({
  items: initialItems,
  projectId,
  slug,
}: {
  items: ChecklistItem[]
  projectId: string
  slug: string
}) {
  const [items, setItems] = useState(initialItems)
  const [adding, setAdding] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    setItems(renumberItems(reordered))

    const result = await reorderChecklistItems(slug, {
      projectId,
      items: reordered.map((item, idx) => ({
        id: item.id,
        sortOrder: idx + 1,
      })),
    })

    if (result.error) {
      toast.error(result.error)
      setItems(initialItems)
    }
  }

  const handleDelete = async (itemId: string) => {
    const result = await deleteChecklistItem(slug, itemId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setItems((prev) => renumberItems(prev.filter((i) => i.id !== itemId)))
      toast.success("Step deleted")
    }
  }

  const handleUpdate = (updated: ChecklistItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    )
  }

  const handleDuplicate = async (itemId: string) => {
    const result = await duplicateChecklistItem(slug, itemId)
    if (result.error) {
      toast.error(result.error)
    } else if (result.item) {
      setItems((prev) => renumberItems([...prev, result.item!]))
      toast.success("Step duplicated")
    }
  }

  const handleSelectToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleEnterBulkMode = () => {
    setBulkMode(true)
    setSelected(new Set())
  }

  const handleExitBulkMode = () => {
    setBulkMode(false)
    setSelected(new Set())
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    const result = await bulkDeleteChecklistItems(slug, ids)
    if (result.error) {
      toast.error(result.error)
    } else {
      setItems((prev) => renumberItems(prev.filter((i) => !selected.has(i.id))))
      toast.success(`${ids.length} ${ids.length === 1 ? "step" : "steps"} deleted`)
      handleExitBulkMode()
    }
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Checklist Steps
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? "step" : "steps"}
            {items.length > 1 && !bulkMode ? " — drag to reorder" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bulkMode ? (
            <>
              <span className="text-sm text-gray-500 mr-1">
                {selectedCount} selected
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={selectedCount === 0}
                    className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Selected ({selectedCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedCount} {selectedCount === 1 ? "step" : "steps"}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedCount} {selectedCount === 1 ? "step" : "steps"} and all associated tester responses. Remaining steps will be renumbered. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete {selectedCount} {selectedCount === 1 ? "step" : "steps"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitBulkMode}
                className="text-gray-600"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnterBulkMode}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                  disabled={adding}
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  Select
                </Button>
              )}
              <Button
                onClick={() => setAdding(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                disabled={adding}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Step
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && !adding && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No checklist steps yet
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Upload an XLSX file or add steps manually
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add your first step
          </Button>
        </div>
      )}

      {/* Step list — DnD disabled in bulk mode */}
      {items.length > 0 && (
        bulkMode ? (
          <div className="space-y-2">
            {items.map((item) => (
              <SortableStepCard
                key={item.id}
                item={item}
                slug={slug}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onDuplicate={handleDuplicate}
                bulkMode={true}
                isSelected={selected.has(item.id)}
                onSelectToggle={handleSelectToggle}
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableStepCard
                    key={item.id}
                    item={item}
                    slug={slug}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onDuplicate={handleDuplicate}
                    bulkMode={false}
                    isSelected={false}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      )}

      {/* Add form */}
      {adding && (
        <AddStepForm
          projectId={projectId}
          slug={slug}
          onAdd={(added) => {
            setItems((prev) => renumberItems([...prev, added]))
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  )
}
