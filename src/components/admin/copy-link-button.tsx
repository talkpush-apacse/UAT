"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}/test/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy Tester Link"}
    </Button>
  )
}
