"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Mail, Loader2, Check, AlertTriangle } from "lucide-react"

type Tester = { id: string; name: string; email: string }

export default function NotifyTestersButton({
  slug,
  testers,
}: {
  slug: string
  testers: Tester[]
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [sentCount, setSentCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(testers.map((t) => t.id))
  )

  const allSelected = selectedIds.size === testers.length
  const noneSelected = selectedIds.size === 0

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(testers.map((t) => t.id)))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSend = async () => {
    setState("sending")
    setErrorMsg(null)
    setDialogOpen(false)

    try {
      const res = await fetch(`/api/projects/${slug}/notify-testers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: window.location.origin,
          testerIds: Array.from(selectedIds),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState("error")
        setErrorMsg(data.error || "Failed to send emails.")
        return
      }

      setSentCount(data.sent)

      if (data.errors && data.errors.length > 0) {
        setState("done")
        setErrorMsg(`Sent ${data.sent} email${data.sent !== 1 ? "s" : ""}, but ${data.errors.length} failed.`)
      } else {
        setState("done")
      }

      setTimeout(() => {
        setState("idle")
        setErrorMsg(null)
      }, 4000)
    } catch {
      setState("error")
      setErrorMsg("Network error. Please try again.")
    }
  }

  if (testers.length === 0) return null

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={state === "sending"}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {state === "sending" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : state === "done" ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                Sent to {sentCount}!
              </>
            ) : state === "error" ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                Failed
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Notify Testers
              </>
            )}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notify testers about review results?</AlertDialogTitle>
            <AlertDialogDescription>
              Select which testers to notify. Each will receive an email summary of their UAT results with a link to view them.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Tester selection list */}
          <div className="my-1 border border-gray-200 rounded-lg overflow-hidden">
            {/* Select all row */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={toggleAll}
            >
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
              <span className="text-sm font-medium text-gray-700">
                {allSelected ? "Deselect all" : "Select all"}
              </span>
              <span className="ml-auto text-xs text-gray-400">{selectedIds.size} / {testers.length}</span>
            </div>

            {/* Tester rows */}
            <div className="max-h-52 overflow-y-auto">
              {testers.map((tester) => (
                <div
                  key={tester.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  onClick={() => toggleOne(tester.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(tester.id)}
                    onCheckedChange={() => toggleOne(tester.id)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{tester.name}</p>
                    <p className="text-xs text-gray-500 truncate">{tester.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={noneSelected}
              className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send to {selectedIds.size} Tester{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error/partial failure message */}
      {errorMsg && (state === "error" || state === "done") && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}
    </>
  )
}
