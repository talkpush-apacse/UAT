"use client"

import { useState, useCallback } from "react"
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(testers.map((t) => t.id)))

  // Reset selection to all when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) setSelected(new Set(testers.map((t) => t.id)))
      setDialogOpen(open)
    },
    [testers]
  )

  const toggleTester = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === testers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(testers.map((t) => t.id)))
    }
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
          testerIds: Array.from(selected),
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
        setErrorMsg(`Sent ${data.sent} emails, but ${data.errors.length} failed.`)
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

  const allSelected = selected.size === testers.length
  const noneSelected = selected.size === 0

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
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
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notify testers about review results</DialogTitle>
            <DialogDescription>
              Select which testers to email. Each will receive a summary of their
              resolved/in-progress items and a link to view their results.
            </DialogDescription>
          </DialogHeader>

          {/* Tester selection list */}
          <div className="py-2">
            {/* Select all / none */}
            <label className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer border-b border-gray-100 mb-1">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && !noneSelected
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {allSelected ? "Deselect all" : "Select all"}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {selected.size} of {testers.length}
              </span>
            </label>

            {/* Tester list */}
            <div className="max-h-60 overflow-y-auto">
              {testers.map((tester) => (
                <label
                  key={tester.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(tester.id)}
                    onChange={() => toggleTester(tester.id)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tester.name}</p>
                    <p className="text-xs text-gray-400 truncate">{tester.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={noneSelected}
              onClick={handleSend}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send to {selected.size} tester{selected.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error tooltip */}
      {errorMsg && state === "error" && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}
    </>
  )
}
