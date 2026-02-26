"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import MDEditor from "@uiw/react-md-editor"
import RichActionEditor from "./RichActionEditor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addChecklistItem } from "@/lib/actions/checklist"
import { toast } from "sonner"
import { Plus, X, ExternalLink } from "lucide-react"
import { type ChecklistItem } from "./types"

/* ------------------------------------------------------------------ */
/*  AddStepForm                                                        */
/* ------------------------------------------------------------------ */

export function AddStepForm({
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
    <div className="bg-white rounded-xl border-2 border-dashed border-brand-sage-lighter shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between px-5 py-3 bg-brand-sage-lightest rounded-t-xl border-b border-brand-sage-lighter">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-sage-darker" />
          <span className="text-sm font-semibold text-brand-sage-darker">
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
          <RichActionEditor
            value={newItem.action}
            onChange={(val) => setNewItem({ ...newItem, action: val })}
            height={120}
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
          <div className="space-y-1.5" data-color-mode="light">
            <Label className="text-xs text-gray-500">Tip</Label>
            <MDEditor
              value={newItem.tip}
              onChange={(val) => setNewItem({ ...newItem, tip: val || "" })}
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
            onClick={onCancel}
            className="text-gray-500"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        </div>
      </div>
    </div>
  )
}
