"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { updateChecklistItem } from "@/lib/actions/checklist"
import { toast } from "sonner"
import {
  GripVertical,
  Pencil,
  Trash2,
  Copy,
  Link as LinkIcon,
  Lightbulb,
  X,
  ExternalLink,
  FileText,
} from "lucide-react"
import MDEditor from "@uiw/react-md-editor"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import RichActionEditor from "./RichActionEditor"
import { type ChecklistItem, ACTOR_STYLES, PATH_STYLES } from "./types"

/* ------------------------------------------------------------------ */
/*  SortableStepCard                                                   */
/* ------------------------------------------------------------------ */

export function SortableStepCard({
  item,
  slug,
  onDelete,
  onUpdate,
  onDuplicate,
  bulkMode,
  isSelected,
  onSelectToggle,
}: {
  item: ChecklistItem
  slug: string
  onDelete: (id: string) => void
  onUpdate: (item: ChecklistItem) => void
  onDuplicate: (id: string) => void
  bulkMode: boolean
  isSelected: boolean
  onSelectToggle: (id: string) => void
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
        <div className="bg-white rounded-xl border-2 border-brand-sage-lighter shadow-md transition-all duration-200">
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
              <RichActionEditor
                value={editData.action}
                onChange={(val) => setEditData({ ...editData, action: val })}
                height={120}
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
              <div className="space-y-1.5" data-color-mode="light">
                <Label className="text-xs text-gray-500">Tip</Label>
                <MDEditor
                  value={editData.tip || ""}
                  onChange={(val) => setEditData({ ...editData, tip: val || "" })}
                  height={80}
                  preview="edit"
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
                className="bg-primary hover:bg-primary/90 text-white"
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
      <div className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${isSelected ? "border-brand-sage bg-brand-sage-lightest/30" : "border-gray-100 hover:border-gray-200"}`}>
        <div className="flex items-start gap-3 p-4">
          {/* Drag handle or checkbox */}
          {bulkMode ? (
            <div className="flex items-center pt-1.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectToggle(item.id)}
                className="h-4 w-4 rounded border-gray-300 text-brand-sage-darker cursor-pointer"
              />
            </div>
          ) : (
            <div
              className="flex items-center pt-0.5"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-400 transition-colors" />
            </div>
          )}

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

            <div className="prose prose-sm prose-gray max-w-none text-sm text-gray-800 leading-relaxed prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{item.action}</ReactMarkdown>
            </div>

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
                    className="inline-flex items-center gap-1 text-xs text-brand-sage-darker hover:text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Reference
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action buttons — hidden in bulk mode */}
          {!bulkMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-brand-sage-darker hover:bg-brand-sage-lightest"
                onClick={() => setEditing(true)}
                title="Edit step"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-brand-sage-darker hover:bg-brand-sage-lightest"
                onClick={() => onDuplicate(item.id)}
                title="Duplicate step"
              >
                <Copy className="h-4 w-4" />
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
          )}
        </div>
      </div>
    </div>
  )
}
