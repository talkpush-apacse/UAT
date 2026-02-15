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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

interface ChecklistItem {
  id: string
  project_id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  sort_order: number
}

function SortableRow({
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
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = async () => {
    const result = await updateChecklistItem(slug, {
      id: item.id,
      stepNumber: editData.step_number,
      path: editData.path as "Happy" | "Non-Happy" | null,
      actor: editData.actor as "Candidate" | "Talkpush" | "Recruiter",
      action: editData.action,
      viewSample: editData.view_sample || "",
      crmModule: editData.crm_module || "",
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      onUpdate(editData)
      setEditing(false)
      toast.success("Item updated")
    }
  }

  if (editing) {
    return (
      <tr ref={setNodeRef} style={style} className="border-t bg-blue-50">
        <td className="p-2">
          <Input
            type="number"
            value={editData.step_number}
            onChange={(e) => setEditData({ ...editData, step_number: parseInt(e.target.value) || 0 })}
            className="w-16 h-8"
          />
        </td>
        <td className="p-2">
          <Select
            value={editData.path || "none"}
            onValueChange={(v) => setEditData({ ...editData, path: v === "none" ? null : v })}
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="Happy">Happy</SelectItem>
              <SelectItem value="Non-Happy">Non-Happy</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="p-2">
          <Select
            value={editData.actor}
            onValueChange={(v) => setEditData({ ...editData, actor: v })}
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Candidate">Candidate</SelectItem>
              <SelectItem value="Talkpush">Talkpush</SelectItem>
              <SelectItem value="Recruiter">Recruiter</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="p-2">
          <Input
            value={editData.action}
            onChange={(e) => setEditData({ ...editData, action: e.target.value })}
            className="h-8"
          />
        </td>
        <td className="p-2">
          <Input
            value={editData.crm_module || ""}
            onChange={(e) => setEditData({ ...editData, crm_module: e.target.value })}
            className="h-8 w-28"
          />
        </td>
        <td className="p-2">
          <div className="flex gap-1">
            <Button size="sm" className="h-7" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditing(false); setEditData(item) }}>
              Cancel
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-t hover:bg-muted/30">
      <td className="p-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mr-2 text-muted-foreground"
        >
          &#x2630;
        </span>
        {item.step_number}
      </td>
      <td className="p-2 text-sm">{item.path || "—"}</td>
      <td className="p-2 text-sm">{item.actor}</td>
      <td className="p-2 text-sm">{item.action}</td>
      <td className="p-2 text-sm text-muted-foreground">{item.crm_module || "—"}</td>
      <td className="p-2">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Step</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete step #{item.step_number} and any associated responses.
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
      </td>
    </tr>
  )
}

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
  const [newItem, setNewItem] = useState({
    stepNumber: (initialItems.length > 0 ? Math.max(...initialItems.map((i) => i.step_number)) + 1 : 1),
    path: null as string | null,
    actor: "Candidate",
    action: "",
    crmModule: "",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    setItems(reordered)

    const result = await reorderChecklistItems(slug, {
      projectId,
      items: reordered.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 })),
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
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success("Step deleted")
    }
  }

  const handleUpdate = (updated: ChecklistItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  const handleAdd = async () => {
    if (!newItem.action.trim()) {
      toast.error("Action is required")
      return
    }

    const result = await addChecklistItem(slug, {
      projectId,
      stepNumber: newItem.stepNumber,
      path: newItem.path as "Happy" | "Non-Happy" | null,
      actor: newItem.actor as "Candidate" | "Talkpush" | "Recruiter",
      action: newItem.action,
      crmModule: newItem.crmModule,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      const added: ChecklistItem = {
        id: result.id!,
        project_id: projectId,
        step_number: newItem.stepNumber,
        path: newItem.path,
        actor: newItem.actor,
        action: newItem.action,
        view_sample: null,
        crm_module: newItem.crmModule || null,
        sort_order: items.length + 1,
      }
      setItems((prev) => [...prev, added])
      setAdding(false)
      setNewItem({
        stepNumber: newItem.stepNumber + 1,
        path: null,
        actor: "Candidate",
        action: "",
        crmModule: "",
      })
      toast.success("Step added")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Checklist Steps</CardTitle>
          <Button size="sm" onClick={() => setAdding(true)}>
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No checklist items. Upload an XLSX file or add steps manually.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium w-20">#</th>
                    <th className="text-left p-2 font-medium">Path</th>
                    <th className="text-left p-2 font-medium">Actor</th>
                    <th className="text-left p-2 font-medium">Action</th>
                    <th className="text-left p-2 font-medium">Module</th>
                    <th className="p-2 font-medium w-32"></th>
                  </tr>
                </thead>
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {items.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        slug={slug}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}

        {adding && (
          <div className="mt-4 p-4 border rounded bg-blue-50 space-y-3">
            <p className="font-medium text-sm">Add New Step</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Input
                type="number"
                placeholder="#"
                value={newItem.stepNumber}
                onChange={(e) => setNewItem({ ...newItem, stepNumber: parseInt(e.target.value) || 0 })}
              />
              <Select
                value={newItem.path || "none"}
                onValueChange={(v) => setNewItem({ ...newItem, path: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Path" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Happy">Happy</SelectItem>
                  <SelectItem value="Non-Happy">Non-Happy</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newItem.actor}
                onValueChange={(v) => setNewItem({ ...newItem, actor: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Candidate">Candidate</SelectItem>
                  <SelectItem value="Talkpush">Talkpush</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Action description"
                value={newItem.action}
                onChange={(e) => setNewItem({ ...newItem, action: e.target.value })}
                className="col-span-2 sm:col-span-1"
              />
              <Input
                placeholder="CRM Module"
                value={newItem.crmModule}
                onChange={(e) => setNewItem({ ...newItem, crmModule: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
