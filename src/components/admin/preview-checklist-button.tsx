"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

export default function PreviewChecklistButton({ slug }: { slug: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="justify-start text-brand-sage-darker border-brand-sage-lighter hover:bg-brand-sage-lightest transition-colors"
    >
      <Link href={`/test/${slug}/preview`} target="_blank" rel="noopener noreferrer">
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        Preview Checklist
      </Link>
    </Button>
  )
}
