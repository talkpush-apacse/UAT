"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { ChangelogSection } from "./ChangelogSection"
import changelog from "../../../CHANGELOG.json"

export function AboutDialog() {
  const latestVersion = changelog[0]?.version ?? "0.0.0"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          <Info className="h-4 w-4 mr-1.5" />
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            UAT Web Interface
            <span className="bg-teal-50 text-teal-700 font-mono text-xs rounded-full px-2.5 py-0.5">
              v{latestVersion}
            </span>
          </DialogTitle>
          <DialogDescription>
            Version history and release notes
          </DialogDescription>
        </DialogHeader>
        <ChangelogSection entries={changelog} />
      </DialogContent>
    </Dialog>
  )
}
