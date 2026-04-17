"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Flag, CheckCircle2, ArrowRight, LogIn } from "lucide-react"
import ChecklistItem from "./checklist-item"
import { markTestComplete } from "@/lib/actions/testers"
import { createAnonClient } from "@/lib/supabase/client"

interface ChecklistItemData {
  id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
  sort_order: number
}

interface ResponseData {
  id: string
  tester_id: string
  checklist_item_id: string
  status: string | null
  comment: string | null
}

interface AttachmentData {
  id: string
  response_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
}

interface Project {
  id: string
  slug: string
  company_name: string
  test_scenario: string | null
  talkpush_login_link: string | null
  wizard_mode?: boolean | null
}

interface Tester {
  id: string
  name: string
  test_completed?: string | null
}

type Props = {
  project: Project
  tester: Tester
  checklistItems: ChecklistItemData[]
  responses: ResponseData[]
  attachments: AttachmentData[]
  testCompleted?: string | null
}

function TalkpushInfoSlide({
  item,
  firstTalkpushItemId,
  talkpushLoginLink,
}: {
  item: ChecklistItemData
  firstTalkpushItemId: string | null
  talkpushLoginLink: string | null
}) {
  return (
    <div className="rounded-xl border border-brand-sage-lighter bg-white shadow-sm overflow-hidden">
      {/* Header band */}
      <div className="bg-brand-sage-lightest border-b border-brand-sage-lighter px-4 py-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-brand-sage-lighter px-2 py-0.5 text-xs font-medium text-brand-sage-darker border border-brand-sage-lighter">
          Talkpush
        </span>
        <span className="text-sm font-medium text-brand-sage-darker">
          Step {item.step_number} · Performed by Talkpush
        </span>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-lg bg-brand-sage-lightest border border-brand-sage-lighter px-3 py-2.5">
          <p className="text-xs font-medium text-brand-sage-darker uppercase tracking-wide mb-1">No action required from you</p>
          <p className="text-sm text-gray-600">This step is performed automatically by Talkpush. Review it and click Next to continue.</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">What happens in this step</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.action}</p>
        </div>
        {item.tip && (
          <div className="rounded-lg bg-brand-amber-lightest border border-brand-amber-lighter px-3 py-2.5">
            <p className="text-xs font-medium text-brand-amber-darker uppercase tracking-wide mb-1">Tip</p>
            <p className="text-sm text-gray-700">{item.tip}</p>
          </div>
        )}
        {item.id === firstTalkpushItemId && talkpushLoginLink && (
          <a
            href={talkpushLoginLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-brand-sage-lighter bg-brand-sage-lightest px-3 py-2.5 text-sm font-medium text-brand-sage-darker hover:bg-brand-sage-lighter transition-colors"
          >
            <LogIn className="h-4 w-4 flex-shrink-0" />
            Open Talkpush Login
          </a>
        )}
      </div>
    </div>
  )
}

export default function ChecklistWizardView({
  project,
  tester,
  checklistItems,
  responses: initialResponses,
  attachments,
  testCompleted = null,
}: Props) {
  const [responses, setResponses] = useState<Record<string, ResponseData>>(() => {
    const map: Record<string, ResponseData> = {}
    initialResponses.forEach((r) => {
      map[r.checklist_item_id] = r
    })
    return map
  })

  const [isTestComplete, setIsTestComplete] = useState(testCompleted === "Yes")
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const totalCount = checklistItems.length

  // Start at the first un-answered non-Talkpush step; Talkpush steps are "already answered"
  const initialIndex = useMemo(() => {
    if (totalCount === 0) return 0
    const firstUnanswered = checklistItems.findIndex((item) => {
      if (item.actor === "Talkpush") return false
      const resp = initialResponses.find((r) => r.checklist_item_id === item.id)
      return !resp || resp.status === null
    })
    return firstUnanswered === -1 ? 0 : firstUnanswered
  }, [checklistItems, initialResponses, totalCount])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const firstTalkpushItemId = useMemo(() => {
    const item = checklistItems.find((i) => i.actor === "Talkpush")
    return item?.id ?? null
  }, [checklistItems])

  const handleResponseUpdate = (itemId: string, response: ResponseData) => {
    setResponses((prev) => ({ ...prev, [itemId]: response }))
  }

  const currentItem = checklistItems[currentIndex]
  const isTalkpushStep = currentItem?.actor === "Talkpush"
  const currentResponse = currentItem ? responses[currentItem.id] : undefined
  const currentHasStatus = currentResponse?.status != null

  const nonTalkpushItems = useMemo(
    () => checklistItems.filter((i) => i.actor !== "Talkpush"),
    [checklistItems]
  )
  const completedNonTalkpush = nonTalkpushItems.filter(
    (i) => responses[i.id]?.status != null
  ).length
  const totalNonTalkpush = nonTalkpushItems.length
  const allNonTalkpushAnswered = completedNonTalkpush === totalNonTalkpush

  const isLastStep = currentIndex === totalCount - 1
  const canSubmit = (isTalkpushStep || currentHasStatus) && allNonTalkpushAnswered

  const progressPct = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0

  const doSaveCurrentStep = async () => {
    if (isTalkpushStep) {
      if (currentResponse?.status !== "Pass") {
        const supabase = createAnonClient()
        const { data } = await supabase
          .from("responses")
          .upsert(
            {
              tester_id: tester.id,
              checklist_item_id: currentItem.id,
              status: "Pass",
              comment: null,
            },
            { onConflict: "tester_id,checklist_item_id" }
          )
          .select()
          .single()
        if (data) handleResponseUpdate(currentItem.id, data)
      }
    } else {
      // Let ChecklistItem's 500ms debounce flush before advancing
      await new Promise((r) => setTimeout(r, 700))
    }
  }

  const handleNext = async () => {
    if (isAdvancing) return
    setIsAdvancing(true)
    await doSaveCurrentStep()
    setCurrentIndex((i) => i + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
    setIsAdvancing(false)
  }

  const handleBack = () => {
    setCurrentIndex((i) => i - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (isMarkingComplete) return
    setIsMarkingComplete(true)
    await doSaveCurrentStep()
    const result = await markTestComplete(tester.id)
    if (!result.error) {
      setIsTestComplete(true)
    }
    setIsMarkingComplete(false)
  }

  // Edge case: no steps
  if (totalCount === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-12 pt-12 text-center">
        <p className="text-gray-500 text-sm">No steps have been configured for this test yet.</p>
      </div>
    )
  }

  // Post-submit success state
  if (isTestComplete) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-5 pb-4 px-4 sm:px-6 -mx-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <h1 className="font-semibold text-lg sm:text-xl text-gray-900 truncate">{project.company_name}</h1>
              <p className="text-sm text-gray-500">Hi {tester.name}</p>
            </div>
            <p className="text-sm sm:text-base font-semibold text-brand-sage-darker flex-shrink-0 ml-4">
              Complete
            </p>
          </div>
          <Progress value={100} className="h-2.5" aria-label="Test completion progress" />
        </div>
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-center gap-2.5 rounded-xl bg-green-50 border border-green-200 py-5 px-6">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-700">Test Marked Complete</span>
          </div>
          <Link
            href={`/test/${project.slug}/results?tester=${tester.id}`}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-sage-lighter bg-white py-3.5 px-6 text-sm font-semibold text-brand-sage-darker hover:bg-brand-sage-lightest hover:border-brand-sage transition-colors"
          >
            View My Results
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const nextDisabled = !isTalkpushStep && !currentHasStatus
  const submitDisabled = !canSubmit || isMarkingComplete

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-5 pb-4 px-4 sm:px-6 -mx-4 border-b border-gray-200 shadow-sm">
        <div
          aria-live="polite"
          className="flex items-center justify-between mb-3"
        >
          <div className="min-w-0">
            <h1 className="font-semibold text-lg sm:text-xl text-gray-900 truncate">{project.company_name}</h1>
            <p className="text-sm text-gray-500">Hi {tester.name}</p>
          </div>
          <p className="text-sm sm:text-base font-semibold text-brand-sage-darker flex-shrink-0 ml-4">
            Step {currentIndex + 1} of {totalCount}
          </p>
        </div>
        <Progress
          value={progressPct}
          className="h-2.5"
          aria-label="Wizard step progress"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalCount}
        />
      </div>

      {/* Step body */}
      <div className="mt-6">
        {isTalkpushStep ? (
          <TalkpushInfoSlide
            item={currentItem}
            firstTalkpushItemId={firstTalkpushItemId}
            talkpushLoginLink={project.talkpush_login_link}
          />
        ) : (
          <ChecklistItem
            key={currentItem.id}
            item={currentItem}
            testerId={tester.id}
            response={responses[currentItem.id] || null}
            attachments={attachments.filter(
              (a) =>
                responses[currentItem.id] &&
                a.response_id === responses[currentItem.id].id
            )}
            onResponseUpdate={handleResponseUpdate}
            talkpushLoginLink={
              currentItem.id === firstTalkpushItemId
                ? project.talkpush_login_link
                : null
            }
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              currentIndex === 0
                ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              aria-disabled={submitDisabled}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold py-3 px-6 text-sm transition-colors shadow-sm ${
                !submitDisabled
                  ? "bg-primary hover:bg-primary/90 active:bg-primary/80 text-white cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Flag className="h-4 w-4" />
              {isMarkingComplete ? "Saving…" : "Submit & Mark Complete"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={nextDisabled || isAdvancing}
              aria-disabled={nextDisabled || isAdvancing}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold py-3 px-6 text-sm transition-colors shadow-sm ${
                !nextDisabled && !isAdvancing
                  ? "bg-primary hover:bg-primary/90 active:bg-primary/80 text-white cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isAdvancing ? "Saving…" : "Next"}
              {!isAdvancing && <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Helper text */}
        {isLastStep && !allNonTalkpushAnswered ? (
          <p className="text-xs text-gray-400 text-center">
            {completedNonTalkpush} of {totalNonTalkpush} steps answered — finish all to submit.
          </p>
        ) : nextDisabled && !isLastStep ? (
          <p className="text-xs text-gray-400 text-center">
            Choose a status (Pass / Fail / N/A / Blocked / Up For Review) to continue.
          </p>
        ) : null}
      </div>
    </div>
  )
}
