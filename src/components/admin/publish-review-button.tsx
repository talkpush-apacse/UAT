"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, Check, Loader2 } from "lucide-react"

export default function PublishReviewButton({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle")

  const handlePublish = async () => {
    setState("loading")
    try {
      const res = await fetch(`/api/share-token/${slug}`)
      const { token } = await res.json()
      const url = `${window.location.origin}/share/analytics/${slug}/${token}`
      await navigator.clipboard.writeText(url)
      setState("done")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("idle")
    }
  }

  return (
    <Button
      size="sm"
      onClick={handlePublish}
      disabled={state === "loading"}
      className="bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
    >
      {state === "loading" ? (
        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Publishing…</>
      ) : state === "done" ? (
        <><Check className="h-3.5 w-3.5 mr-1.5" />Link Copied!</>
      ) : (
        <><Send className="h-3.5 w-3.5 mr-1.5" />Publish to Client</>
      )}
    </Button>
  )
}
