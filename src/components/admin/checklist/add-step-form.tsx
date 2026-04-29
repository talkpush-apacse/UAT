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
import type { Actor } from "@/lib/constants"
import { toast } from "sonner"
import { Plus, X, ExternalLink, Bookmark } from "lucide-react"
import { type ChecklistItem } from "./types"

/* ------------------------------------------------------------------ */
/*  AddStepForm — handles both 'step' and 'phase_header' modes         */
/* ------------------------------------------------------------------ */

type Mode = "step" | "phase_header"

export function AddStepForm({
  projectId,
  slug,
  mode = "step",
  onAdd,
  onCancel,
}: {
  projectId: string
  slug: string
  mode?: Mode
  onAdd: (item: ChecklistItem) => void
  onCancel: () => void
}) {
  const isHeader = mode === "phase_header"

  const [newItem, setNewItem] = useState({
    path: null as string | null,
    actor: "Candidate",
    action: "",
    viewSample: "",
    crmModule: "",
    tip: "",
    headerLabel: "",
  })

  const handleAdd = async () => {
    if (!newItem.action.trim()) {
      toast.error(isHeader ? "Title is required" : "Action is required")
      return
    }

    const result = await addChecklistItem(slug, {
      projectId,
      itemType: mode,
      // path/actor are not meaningful on headers; the server defaults them.
      path: isHeader ? null : (newItem.path as "Happy" | "Non-Happy" | null),
      actor: isHeader ? undefined : (newItem.actor as Actor),
      action: newItem.action,
      viewSample: isHeader ? "" : newItem.viewSample,
      crmModule: isHeader ? "" : newItem.crmModule,
      tip: newItem.tip,
      headerLabel: isHeader ? newItem.headerLabel : "",
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    const added: ChecklistItem = {
      id: result.id!,
      project_id: projectId,
      step_number: isHeader ? null : 0, // renumberItems() in parent fills this in
      path: isHeader ? null : newItem.path,
      actor: isHeader ? "Talkpush" : newItem.actor,
      action: newItem.action,
      view_sample: isHeader ? null : newItem.viewSample || null,
      crm_module: isHeader ? null : newItem.crmModule || null,
      tip: newItem.tip || null,
      sort_order: 0, // server assigns
      item_type: mode,
      header_label: isHeader ? newItem.headerLabel || null : null,
    }
    onAdd(added)
    toast.success(isHeader ? "Section header added" : "Step added")
  }

  const accentClasses = isHeader
    ? {
        wrapper: "border-brand-lavender-lighter",
        bar: "bg-brand-lavender-lightest border-brand-lavender-lighter",
        title: "text-brand-lavender-darker",
        icon: "text-brand-lavender-darker",
        cta: "bg-brand-lavender-darker hover:bg-brand-lavender text-white",
        ctaIcon: <Bookmark className="h-4 w-4 mr-1" />,
        ctaLabel: "Add Section Header",
        heading: "Add New Section Header",
      }
    : {
        wrapper: "border-brand-sage-lighter",
        bar: "bg-brand-sage-lightest border-brand-sage-lighter",
        title: "text-brand-sage-darker",
        icon: "text-brand-sage-darker",
        cta: "bg-primary hover:bg-primary/90 text-white",
        ctaIcon: <Plus className="h-4 w-4 mr-1" />,
        ctaLabel: "Add Step",
        heading: "Add New Step",
      }

  return (
    <div className={`bg-white rounded-xl border-2 border-dashed ${accentClasses.wrapper} shadow-sm transition-all duration-200`}>
      <div className={`flex items-center justify-between px-5 py-3 ${accentClasses.bar} rounded-t-xl border-b`}>
        <div className="flex items-center gap-2">
          {isHeader ? (
            <Bookmark className={`h-4 w-4 ${accentClasses.icon}`} />
          ) : (
            <Plus className={`h-4 w-4 ${accentClasses.icon}`} />
          )}
          <span className={`text-sm font-semibold ${accentClasses.title}`}>
            {accentClasses.heading}
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
        {isHeader ? (
          <>
            {/* Section Header form: just label + title + optional tip */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">
                Section Label <span className="text-gray-400">(optional)</span>
              </Label>
              <Input
                value={newItem.headerLabel}
                onChange={(e) =>
                  setNewItem({ ...newItem, headerLabel: e.target.value })
                }
                placeholder='e.g. "SECTION A" or "PHASE 1"'
                maxLength={120}
              />
              <p className="text-xs text-gray-400">
                Short uppercase tag rendered as a chip on the header card
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Title / Description</Label>
              <RichActionEditor
                value={newItem.action}
                onChange={(val) => setNewItem({ ...newItem, action: val })}
                height={120}
              />
              <p className="text-xs text-gray-400">
                The phase title and any introductory copy testers should read
              </p>
            </div>

            <div className="space-y-1.5" data-color-mode="light">
              <Label className="text-xs text-gray-500">
                Tip <span className="text-gray-400">(optional)</span>
              </Label>
              <MDEditor
                value={newItem.tip}
                onChange={(val) => setNewItem({ ...newItem, tip: val || "" })}
                height={80}
                preview="edit"
              />
            </div>
          </>
        ) : (
          <>
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
                <Label className="text-xs text-gray-500">Tester Perspective</Label>
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
                    <SelectItem value="Referrer/Vendor">Referrer/Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Action</Label>
              <RichActionEditor
                value={newItem.action}
                onChange={(val) => setNewItem({ ...newItem, action: val })}
                height={120}
              />
            </div>

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
          </>
        )}

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
            className={accentClasses.cta}
          >
            {accentClasses.ctaIcon}
            {accentClasses.ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
