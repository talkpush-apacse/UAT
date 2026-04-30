"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

export default function PreviewChecklistButton({ slug, className }: { slug: string; className?: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`text-gray-500 hover:text-[#00BFA5] hover:bg-teal-50 transition-colors ${className ?? ""}`}
    >
      <Link href={`/test/${slug}/preview`} target="_blank" rel="noopener noreferrer">
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        Preview Checklist
      </Link>
    </Button>
  )
}
