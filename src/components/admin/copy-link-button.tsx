"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link as LinkIcon, Check } from "lucide-react"

export default function CopyLinkButton({ slug, className }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const base = (process.env.NEXT_PUBLIC_APP_URL || "https://uat.talkpush.com").trim()
    const url = `${base}/test/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={`text-gray-500 hover:text-[#00BFA5] hover:bg-teal-50 transition-colors ${className ?? ""}`}
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
