"use client"

import { useState } from "react"
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
import { Mail, Loader2, Check, AlertTriangle } from "lucide-react"

export default function NotifyTestersButton({
  slug,
  testerCount,
}: {
  slug: string
  testerCount: number
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [sentCount, setSentCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSend = async () => {
    setState("sending")
    setErrorMsg(null)
    setDialogOpen(false)

    try {
      const res = await fetch(`/api/projects/${slug}/notify-testers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: window.location.origin }),
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

  if (testerCount === 0) return null

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
              This will send an email to{" "}
              <strong className="text-gray-700">{testerCount} tester{testerCount !== 1 ? "s" : ""}</strong>{" "}
              who reported issues, letting them know their findings have been reviewed. Each email includes
              a summary of resolved/in-progress items and a link to view their results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send Emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error tooltip */}
      {errorMsg && state === "error" && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}
    </>
  )
}
