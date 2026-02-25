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
  const [skippedTesters, setSkippedTesters] = useState<{ name: string; reason: string }[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
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
    setSkippedTesters([])
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
      const skipped: { name: string; reason: string }[] = data.skipped || []
      setSkippedTesters(skipped)

      if (data.errors && data.errors.length > 0) {
        setState("done")
        setErrorMsg(`Sent ${data.sent} emails, but ${data.errors.length} failed.`)
      } else {
        setState("done")
      }

      // Show result dialog if any testers were skipped
      if (skipped.length > 0) {
        setResultDialogOpen(true)
      } else {
        setTimeout(() => {
          setState("idle")
          setErrorMsg(null)
        }, 4000)
      }
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
                {sentCount > 0 ? (
                  <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                )}
                {sentCount > 0 ? `Sent to ${sentCount}!` : "No emails sent"}
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

      {/* Result dialog — shown when testers were skipped */}
      <Dialog
        open={resultDialogOpen}
        onOpenChange={(open) => {
          setResultDialogOpen(open)
          if (!open) {
            setState("idle")
            setErrorMsg(null)
            setSkippedTesters([])
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email notification results</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sent summary */}
            <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {sentCount} email{sentCount !== 1 ? "s" : ""} sent successfully
                </p>
              </div>
            </div>

            {/* Skipped testers */}
            {skippedTesters.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                <div className="flex items-start gap-3 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-800">
                    {skippedTesters.length} tester{skippedTesters.length !== 1 ? "s" : ""} skipped
                  </p>
                </div>
                <p className="text-xs text-amber-700 mb-2 ml-7">
                  Emails are only sent to testers who reported at least one Fail or Blocked step.
                </p>
                <div className="ml-7 space-y-1.5">
                  {skippedTesters.map((t, i) => (
                    <div key={i} className="flex items-baseline gap-2 text-xs">
                      <span className="font-medium text-amber-900">{t.name}</span>
                      <span className="text-amber-600">— {t.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setResultDialogOpen(false)
                setState("idle")
                setErrorMsg(null)
                setSkippedTesters([])
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
