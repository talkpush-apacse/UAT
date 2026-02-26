"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Loader2 } from "lucide-react"

export default function CopyAnalyticsLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/share-token/${slug}`)
      const { token } = await res.json()
      const url = `${window.location.origin}/share/analytics/${slug}/${token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={loading}
      className="text-brand-sage-darker border-brand-sage-lighter hover:bg-brand-sage-lightest transition-colors"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Generating…
        </>
      ) : copied ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Share Analytics
        </>
      )}
    </Button>
  )
}
