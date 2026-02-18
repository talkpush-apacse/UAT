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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  updateChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from "@/lib/actions/checklist"
import { toast } from "sonner"
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Link as LinkIcon,
  Lightbulb,
  X,
  ExternalLink,
  FileText,
} from "lucide-react"

interface ChecklistItem {
  id: string
  project_id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
  sort_order: number
}

const ACTOR_STYLES: Record<string, string> = {
  Candidate: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Talkpush: "bg-purple-50 text-purple-700 border-purple-200",
  Recruiter: "bg-teal-50 text-teal-700 border-teal-200",
}

const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

/** Renumber items client-side: step_number = position (1-indexed) */
function renumberItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item, idx) => ({ ...item, step_number: idx + 1 }))
}

/* ------------------------------------------------------------------ */
/*  SortableStepCard                                                   */
/* ------------------------------------------------------------------ */

function SortableStepCard({
  item,
  slug,
  onDelete,
  onUpdate,
}: {
  item: ChecklistItem
  slug: string
  onDelete: (id: string) => void
  onUpdate: (item: ChecklistItem) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = async () => {
    const result = await updateChecklistItem(slug, {
      id: item.id,
      path: editData.path as "Happy" | "Non-Happy" | null,
      actor: editData.actor as "Candidate" | "Talkpush" | "Recruiter",
      action: editData.action,
      viewSample: editData.view_sample || "",
      crmModule: editData.crm_module || "",
      tip: editData.tip || "",
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      onUpdate(editData)
      setEditing(false)
      toast.success("Step updated")
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setEditData(item)
  }

  /* ---------- EDIT MODE ---------- */
  if (editing) {
    return (
      <div ref={setNodeRef} style={style}>
        <div className="bg-white rounded-xl border-2 border-emerald-200 shadow-md transition-all duration-200">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 rounded-t-xl border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              Editing Step {item.step_number}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1: Path | Actor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Path</Label>
                <Select
                  value={editData.path || "none"}
                  onValueChange={(v) =>
                    setEditData({ ...editData, path: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Happy">Happy</SelectItem>
                    <SelectItem value="Non-Happy">Non-Happy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Actor</Label>
                <Select
                  value={editData.actor}
                  onValueChange={(v) => setEditData({ ...editData, actor: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Candidate">Candidate</SelectItem>
                    <SelectItem value="Talkpush">Talkpush</SelectItem>
                    <SelectItem value="Recruiter">Recruiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Action */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Action</Label>
              <Textarea
                value={editData.action}
                onChange={(e) => setEditData({ ...editData, action: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Row 3: Link to Sample/Guide */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Link to Sample / Guide</Label>
              <div className="relative">
                <Input
                  type="url"
                  value={editData.view_sample || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, view_sample: e.target.value })
                  }
                  placeholder="https://example.com/sample-screenshot.png"
                  className="pl-9"
                />
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400">
                URL to a screenshot or guide testers should review for this step
              </p>
            </div>

            {/* Row 4: Module | Tip */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">CRM Module</Label>
                <Input
                  value={editData.crm_module || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, crm_module: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Tip</Label>
                <Input
                  value={editData.tip || ""}
                  onChange={(e) => setEditData({ ...editData, tip: e.target.value })}
                  placeholder="Optional tip for testers"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-gray-500"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- DISPLAY MODE ---------- */
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
        <div className="flex items-start gap-3 p-4">
          {/* Drag handle */}
          <div
            className="flex items-center pt-0.5"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-400 transition-colors" />
          </div>

          {/* Step number pill */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
            {item.step_number}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-xs font-medium ${ACTOR_STYLES[item.actor] || ""}`}
              >
                {item.actor}
              </Badge>
              {item.path && (
                <Badge
                  variant="outline"
                  className={`text-xs ${PATH_STYLES[item.path] || ""}`}
                >
                  {item.path}
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-800 leading-relaxed">{item.action}</p>

            {/* Indicator icons */}
            {(item.crm_module || item.tip || item.view_sample?.trim()) && (
              <div className="flex items-center gap-3 mt-2">
                {item.crm_module && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <FileText className="h-3 w-3" />
                    {item.crm_module}
                  </span>
                )}
                {item.tip && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <Lightbulb className="h-3 w-3" />
                    Tip
                  </span>
                )}
                {item.view_sample?.trim() && (
                  <a
                    href={item.view_sample}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Reference
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={() => setEditing(true)}
              title="Edit step"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete step"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Step</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete step #{item.step_number} and any associated
                    responses. Remaining steps will be renumbered automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AddStepForm                                                        */
/* ------------------------------------------------------------------ */

function AddStepForm({
  projectId,
  slug,
  onAdd,
  onCancel,
}: {
  projectId: string
  slug: string
  onAdd: (item: ChecklistItem) => void
  onCancel: () => void
}) {
  const [newItem, setNewItem] = useState({
    path: null as string | null,
    actor: "Candidate",
    action: "",
    viewSample: "",
    crmModule: "",
    tip: "",
  })

  const handleAdd = async () => {
    if (!newItem.action.trim()) {
      toast.error("Action is required")
      return
    }

    const result = await addChecklistItem(slug, {
      projectId,
      path: newItem.path as "Happy" | "Non-Happy" | null,
      actor: newItem.actor as "Candidate" | "Talkpush" | "Recruiter",
      action: newItem.action,
      viewSample: newItem.viewSample,
      crmModule: newItem.crmModule,
      tip: newItem.tip,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      const added: ChecklistItem = {
        id: result.id!,
        project_id: projectId,
        step_number: 0, // Will be set by renumberItems in parent
        path: newItem.path,
        actor: newItem.actor,
        action: newItem.action,
        view_sample: newItem.viewSample || null,
        crm_module: newItem.crmModule || null,
        tip: newItem.tip || null,
        sort_order: 0, // Will be set by server
      }
      onAdd(added)
      toast.success("Step added")
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-emerald-300 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 rounded-t-xl border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-700" />
          <span className="text-sm font-semibold text-emerald-800">
            Add New Step
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Row 1: Path | Actor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Path</Label>
            <Select
              value={newItem.path || "none"}
              onValueChange={(v) =>
                setNewItem({ ...newItem, path: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Path" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Happy">Happy</SelectItem>
                <SelectItem value="Non-Happy">Non-Happy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Actor</Label>
            <Select
              value={newItem.actor}
              onValueChange={(v) => setNewItem({ ...newItem, actor: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Candidate">Candidate</SelectItem>
                <SelectItem value="Talkpush">Talkpush</SelectItem>
                <SelectItem value="Recruiter">Recruiter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Action */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Action</Label>
          <Textarea
            value={newItem.action}
            onChange={(e) => setNewItem({ ...newItem, action: e.target.value })}
            rows={2}
            className="resize-none"
            placeholder="Describe the action for this step"
          />
        </div>

        {/* Row 3: Link to Sample/Guide */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Link to Sample / Guide</Label>
          <div className="relative">
            <Input
              type="url"
              value={newItem.viewSample}
              onChange={(e) =>
                setNewItem({ ...newItem, viewSample: e.target.value })
              }
              placeholder="https://example.com/sample-screenshot.png"
              className="pl-9"
            />
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-400">
            URL to a screenshot or guide testers should review for this step
          </p>
        </div>

        {/* Row 4: Module | Tip */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">CRM Module</Label>
            <Input
              value={newItem.crmModule}
              onChange={(e) =>
                setNewItem({ ...newItem, crmModule: e.target.value })
              }
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Tip</Label>
            <Input
              value={newItem.tip}
              onChange={(e) => setNewItem({ ...newItem, tip: e.target.value })}
              placeholder="Optional tip for testers"
            />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-500"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        </div>
      </div>
    </div>
  )
}

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

    // Renumber step_numbers client-side for instant feedback
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
      // Remove the item and renumber remaining steps
      setItems((prev) => renumberItems(prev.filter((i) => i.id !== itemId)))
      toast.success("Step deleted")
    }
  }

  const handleUpdate = (updated: ChecklistItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    )
  }

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
            {items.length > 1 ? " — drag to reorder" : ""}
          </p>
        </div>
        <Button
          onClick={() => setAdding(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
          disabled={adding}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Step
        </Button>
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

      {/* Step list with DnD */}
      {items.length > 0 && (
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add form */}
      {adding && (
        <AddStepForm
          projectId={projectId}
          slug={slug}
          onAdd={(added) => {
            // Append and renumber
            setItems((prev) => renumberItems([...prev, added]))
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  )
}
