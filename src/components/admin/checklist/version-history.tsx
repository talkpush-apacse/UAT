"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { History, Save, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"

function formatSnapshotDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  createChecklistSnapshot,
  deleteChecklistSnapshot,
  revertToSnapshot,
  type ChecklistSnapshot,
} from "@/lib/actions/checklist"

interface VersionHistoryProps {
  slug: string
  initialSnapshots: ChecklistSnapshot[]
}

export function VersionHistory({ slug, initialSnapshots }: VersionHistoryProps) {
  const router = useRouter()

  const [snapshots, setSnapshots] = useState<ChecklistSnapshot[]>(initialSnapshots)
  const [expanded, setExpanded] = useState(false)

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false)
  const [labelInput, setLabelInput] = useState("")
  const [saving, setSaving] = useState(false)

  // Restore confirm
  const [restoreTarget, setRestoreTarget] = useState<ChecklistSnapshot | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ChecklistSnapshot | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    if (!labelInput.trim()) return
    setSaving(true)
    const result = await createChecklistSnapshot(slug, labelInput.trim())
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.snapshot) {
      setSnapshots((prev) => [result.snapshot!, ...prev])
      setSaveOpen(false)
      setLabelInput("")
      if (!expanded) setExpanded(true)
      toast.success(`Version saved: "${result.snapshot.label}"`)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    const result = await revertToSnapshot(slug, restoreTarget.id)
    setRestoring(false)

    if (result.blockedByResponses !== undefined) {
      toast.error(
        `Cannot restore — ${result.blockedByResponses} tester ${
          result.blockedByResponses === 1 ? "response exists" : "responses exist"
        }. Remove all testers first, then try again.`,
        { duration: 7000 }
      )
      setRestoreTarget(null)
      return
    }

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        `Restored to "${restoreTarget.label}" — ${result.itemCount} step${
          result.itemCount === 1 ? "" : "s"
        } loaded`
      )
      setRestoreTarget(null)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteChecklistSnapshot(slug, deleteTarget.id)
    setDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      setSnapshots((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      toast.success(`Version "${deleteTarget.label}" deleted`)
      setDeleteTarget(null)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* ── Section header (clickable to expand/collapse) ── */}
        <div
          role="button"
          tabIndex={0}
          className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-sage-darker"
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v)
          }}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Version History</span>
            {snapshots.length > 0 && (
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-mono tabular-nums">
                {snapshots.length}
              </span>
            )}
          </div>

          {/* Save Version button — stopPropagation so it doesn't toggle the panel */}
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-white hover:border-brand-sage-lighter hover:text-brand-sage-darker"
              onClick={() => {
                setLabelInput("")
                setSaveOpen(true)
              }}
            >
              <Save className="h-3 w-3 mr-1" />
              Save Version
            </Button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* ── Snapshot list ── */}
        {expanded && (
          <div className="divide-y divide-gray-100">
            {snapshots.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No saved versions yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Save a version before making big changes to preserve a restore point.
                </p>
              </div>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Version badge */}
                    <span className="shrink-0 bg-teal-50 text-teal-700 font-mono text-xs rounded-full px-2.5 py-0.5 border border-teal-100">
                      v{snap.version_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{snap.label}</p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {snap.item_count} {snap.item_count === 1 ? "step" : "steps"}&nbsp;·&nbsp;
                        {formatSnapshotDate(snap.created_at ?? "")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-gray-200 text-gray-600 hover:text-brand-sage-darker hover:border-brand-sage-lighter"
                      onClick={() => setRestoreTarget(snap)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(snap)}
                      title="Delete this version"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Save Version Dialog ── */}
      <Dialog
        open={saveOpen}
        onOpenChange={(open) => {
          if (!saving) setSaveOpen(open)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label
              htmlFor="snapshot-label"
              className="text-sm font-medium text-gray-700 mb-1 block"
            >
              Version label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="snapshot-label"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="e.g. Before QA review, After client walkthrough"
              maxLength={100}
              className="border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && labelInput.trim()) handleSave()
              }}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1.5">
              A snapshot of all current steps will be saved and can be restored later.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!labelInput.trim() || saving}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {saving ? "Saving…" : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Confirm Dialog ── */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!restoring && !open) setRestoreTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to &quot;{restoreTarget?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current checklist steps with the{" "}
              <strong>{restoreTarget?.item_count} step{restoreTarget?.item_count === 1 ? "" : "s"}</strong>{" "}
              saved in this version. The restore is blocked if any tester responses exist — remove
              all testers first if needed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-brand-sage-darker hover:bg-brand-sage-darker/90 text-white"
            >
              {restoring ? "Restoring…" : "Yes, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Snapshot Confirm ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!deleting && !open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved snapshot permanently. Current checklist steps are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting…" : "Delete Version"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
