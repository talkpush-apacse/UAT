"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link as LinkIcon, Check } from "lucide-react"

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}/test/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="text-brand-sage-darker border-brand-sage-lighter hover:bg-brand-sage-lightest transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Copied!
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
          Copy Tester Link
        </>
      )}
    </Button>
  )
}
