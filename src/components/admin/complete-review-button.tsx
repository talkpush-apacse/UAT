"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { CheckCircle2, Loader2, Check, AlertTriangle } from "lucide-react"
import { completeAllReviews } from "@/lib/actions/admin-reviews"
import type { TesterSection } from "@/app/admin/projects/[slug]/review/page"

export default function CompleteReviewButton({
  slug,
  testerSections,
}: {
  slug: string
  testerSections: TesterSection[]
}) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [dialogOpen, setDialogOpen] = useState(false)

  const stats = useMemo(() => {
    let totalItems = 0
    let uncategorizedCount = 0
    let unresolvedCount = 0
    const allItems: { checklistItemId: string; testerId: string }[] = []

    for (const section of testerSections) {
      for (const step of section.steps) {
        totalItems++
        allItems.push({
          checklistItemId: step.checklistItemId,
          testerId: section.tester.id,
        })
        if (!step.adminReview?.behaviorType) uncategorizedCount++
        if (step.adminReview?.resolutionStatus !== "Done") unresolvedCount++
      }
    }
    return { totalItems, uncategorizedCount, unresolvedCount, allItems }
  }, [testerSections])

  const handleComplete = async () => {
    setState("loading")
    setDialogOpen(false)

    try {
      const result = await completeAllReviews(stats.allItems, slug)

      if (result.error) {
        setState("error")
        return
      }

      setState("done")
      router.refresh()

      setTimeout(() => {
        setState("idle")
      }, 4000)
    } catch {
      setState("error")
    }
  }

  if (stats.totalItems === 0) return null

  // All items already fully complete
  const allComplete = stats.uncategorizedCount === 0 && stats.unresolvedCount === 0

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={state === "loading" || allComplete}
          className="border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          {state === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Completing…
            </>
          ) : state === "done" ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              Completed!
            </>
          ) : state === "error" ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
              Failed
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Complete Review
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete all review items?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-500">
              <p>
                This will finalize the review for all{" "}
                <strong className="text-gray-700">{stats.totalItems} item{stats.totalItems !== 1 ? "s" : ""}</strong>.
              </p>
              <ul className="space-y-1.5 list-disc pl-5">
                {stats.uncategorizedCount > 0 && (
                  <li>
                    <strong className="text-gray-700">{stats.uncategorizedCount}</strong> uncategorized item{stats.uncategorizedCount !== 1 ? "s" : ""} will be set to{" "}
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Expected Behavior
                    </span>
                  </li>
                )}
                {stats.unresolvedCount > 0 && (
                  <li>
                    <strong className="text-gray-700">{stats.unresolvedCount}</strong> unresolved item{stats.unresolvedCount !== 1 ? "s" : ""} will be marked as{" "}
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Done
                    </span>
                  </li>
                )}
              </ul>
              <p className="text-xs text-gray-400">
                Items you already categorized will keep their current finding type.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleComplete}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Complete Review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
