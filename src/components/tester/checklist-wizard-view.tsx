"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Flag, CheckCircle2, ArrowRight, List, Bookmark } from "lucide-react"
import ChecklistItem from "./checklist-item"
import PhaseHeaderCard from "./phase-header-card"
import { markTestComplete } from "@/lib/actions/testers"
import { getStepsMissingEvidence, EVIDENCE_REQUIRED_STATUSES } from "@/lib/utils/response-validation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import TesterHeader from "./tester-header"
import { TESTER_BTN_DISABLED, TESTER_BTN_OUTLINE, TESTER_BTN_PRIMARY } from "./tester-ui"
import { trackMarkCompleteFailed, trackTestCompleted } from "./completion-tracking"

interface ChecklistItemData {
  id: string
  step_number: number | null
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
  sort_order: number
  item_type: string
  header_label: string | null
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
  client?: { logo_url: string | null } | null
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
  previewMode?: boolean
}

function TalkpushVerifyHeader() {
  return (
    <div className="mb-3 rounded-xl border-2 border-primary bg-brand-sage-lightest px-4 py-3">
      <p className="text-sm font-bold text-primary">Done by Talkpush: confirm it ran</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">
        This step runs automatically. Mark Pass if it ran as expected, or Fail / Blocked if it didn&apos;t.
      </p>
    </div>
  )
}

export default function ChecklistWizardView({
  project,
  tester,
  checklistItems,
  responses: initialResponses,
  attachments: initialAttachments,
  testCompleted = null,
  previewMode = false,
}: Props) {
  const [responses, setResponses] = useState<Record<string, ResponseData>>(() => {
    const map: Record<string, ResponseData> = {}
    initialResponses.forEach((r) => {
      map[r.checklist_item_id] = r
    })
    return map
  })

  const [attachments, setAttachments] = useState<AttachmentData[]>(initialAttachments)

  const [isTestComplete, setIsTestComplete] = useState(testCompleted === "Yes")
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)

  const handleAttachmentsChange = (responseId: string, newAttachments: AttachmentData[]) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.response_id !== responseId),
      ...newAttachments,
    ])
  }

  const totalCount = checklistItems.length
  // Phase headers are not answerable — they don't require a status and don't
  // gate the "all answered" check. The DB triggers also reject any response
  // pointing at a header row.
  const isAnswerable = (item: ChecklistItemData) => item.item_type !== "phase_header"
  const answerableItems = useMemo(
    () => checklistItems.filter(isAnswerable),
    [checklistItems]
  )
  const totalAnswerable = answerableItems.length

  // 1-based position among answerable steps (phase headers excluded), for analytics
  const stepPositions = useMemo(
    () => new Map(answerableItems.map((item, i) => [item.id, i + 1])),
    [answerableItems]
  )

  // Start at the first un-answered *answerable* step (skip phase headers)
  const initialIndex = useMemo(() => {
    if (totalCount === 0) return 0
    if (previewMode) return 0
    const firstUnanswered = checklistItems.findIndex((item) => {
      if (!isAnswerable(item)) return false
      const resp = initialResponses.find((r) => r.checklist_item_id === item.id)
      return !resp || resp.status === null
    })
    return firstUnanswered === -1 ? 0 : firstUnanswered
  }, [checklistItems, initialResponses, previewMode, totalCount])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const firstTalkpushItemId = useMemo(() => {
    const item = checklistItems.find(
      (i) => isAnswerable(i) && i.actor === "Talkpush"
    )
    return item?.id ?? null
  }, [checklistItems])

  const handleResponseUpdate = (itemId: string, response: ResponseData) => {
    setResponses((prev) => ({ ...prev, [itemId]: response }))
  }

  const currentItem = checklistItems[currentIndex]
  const isHeaderStep = currentItem?.item_type === "phase_header"
  const isTalkpushStep = !isHeaderStep && currentItem?.actor === "Talkpush"
  const currentResponse = currentItem ? responses[currentItem.id] : undefined
  const currentHasStatus = previewMode || currentResponse?.status != null

  // Fail/Blocked/Up For Review steps must have a comment or an attachment before advancing/submitting.
  const stepsMissingEvidence = useMemo(
    () => getStepsMissingEvidence(Object.values(responses), attachments),
    [responses, attachments]
  )
  const currentRequiresComment =
    !previewMode &&
    !isHeaderStep &&
    currentResponse?.status != null &&
    EVIDENCE_REQUIRED_STATUSES.includes(currentResponse.status as (typeof EVIDENCE_REQUIRED_STATUSES)[number])
  const currentCommentMissing =
    currentRequiresComment && stepsMissingEvidence.includes(currentItem.id)

  const completedCount = previewMode
    ? totalAnswerable
    : answerableItems.filter((i) => responses[i.id]?.status != null).length
  const allAnswered = completedCount === totalAnswerable

  const isLastStep = currentIndex === totalCount - 1
  // Phase headers: no status required to advance. Steps: require status + comment/screenshot if applicable,
  // and no other flagged step (e.g. one the tester jumped back to and edited) may be missing evidence either.
  const canSubmit =
    !previewMode &&
    (isHeaderStep || currentHasStatus) &&
    allAnswered &&
    stepsMissingEvidence.length === 0

  const progressPct = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0

  const doSaveCurrentStep = async () => {
    // Let ChecklistItem's 500ms debounce flush before advancing
    await new Promise((r) => setTimeout(r, 700))
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

  const handleJumpToStep = (index: number) => {
    setCurrentIndex(index)
    setIsNavOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (isMarkingComplete) return
    setIsMarkingComplete(true)
    setCompleteError(null)
    await doSaveCurrentStep()
    try {
      const result = await markTestComplete(tester.id)
      if (!result.error) {
        setIsTestComplete(true)
        trackTestCompleted(project.slug, "wizard", answerableItems, responses)
      } else {
        setCompleteError(result.error)
        trackMarkCompleteFailed(project.slug, "wizard", result.error)
      }
    } catch (err) {
      // Server action unreachable (e.g. offline) — previously the button
      // stayed stuck on "Saving…" with no message.
      setCompleteError("Couldn't reach the server. Check your connection and try again.")
      trackMarkCompleteFailed(project.slug, "wizard", err)
    }
    setIsMarkingComplete(false)
  }

  // Edge case: no steps
  if (totalCount === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-12 pt-12 text-center">
        <p className="text-sm font-medium text-gray-700">No steps have been configured for this test yet.</p>
      </div>
    )
  }

  // Post-submit success state
  if (isTestComplete) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <TesterHeader
          clientLogoUrl={project.client?.logo_url}
          companyName={project.company_name}
          subtitle={`Hi ${tester.name}`}
          right="Complete"
        >
          <Progress value={100} className="h-3.5 border-2 border-primary bg-white" aria-label="Test completion progress" />
        </TesterHeader>
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-green-700 bg-green-50 px-6 py-5">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-700" />
            <span className="font-bold text-green-800">Test Submitted</span>
          </div>
          <Link
            href={`/test/${project.slug}/results?tester=${tester.id}`}
            className={`${TESTER_BTN_OUTLINE} w-full px-6 py-3.5 text-base`}
          >
            View My Results
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const nextDisabled =
    !previewMode &&
    !isHeaderStep && (!currentHasStatus || currentCommentMissing)
  const submitDisabled =
    !canSubmit ||
    isMarkingComplete ||
    (!isHeaderStep && currentCommentMissing)

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      <TesterHeader
        clientLogoUrl={project.client?.logo_url}
        companyName={project.company_name}
        subtitle={previewMode ? "UAT steps preview" : `Hi ${tester.name}`}
        ariaLive="polite"
        right={
          <button
            type="button"
            onClick={() => setIsNavOpen(true)}
            className="flex items-center gap-1.5 rounded text-base font-bold text-primary hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open step navigation"
          >
            Step {currentIndex + 1} of {totalCount}
            <List className="h-4 w-4" />
          </button>
        }
      >
        <Progress
          value={progressPct}
          className="h-3.5 border-2 border-primary bg-white"
          aria-label="Wizard step progress"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalCount}
        />
      </TesterHeader>


      {/* Step body */}
      <div className="mt-6">
        {isHeaderStep ? (
          <PhaseHeaderCard
            label={currentItem.header_label}
            action={currentItem.action}
            tip={currentItem.tip}
          />
        ) : (
          <>
            {isTalkpushStep && <TalkpushVerifyHeader />}
            <ChecklistItem
              key={currentItem.id}
              item={currentItem as ChecklistItemData & { step_number: number }}
              testerId={tester.id}
              response={responses[currentItem.id] || null}
              attachments={attachments.filter(
                (a) =>
                  responses[currentItem.id] &&
                  a.response_id === responses[currentItem.id].id
              )}
              onResponseUpdate={handleResponseUpdate}
              onAttachmentsChange={handleAttachmentsChange}
              talkpushLoginLink={
                currentItem.id === firstTalkpushItemId
                  ? project.talkpush_login_link
                  : null
              }
              previewMode={previewMode}
              trackingContext={{
                project_slug: project.slug,
                step_position: stepPositions.get(currentItem.id) ?? 0,
                total_steps: totalAnswerable,
                view_mode: "wizard",
              }}
            />
          </>
        )}
      </div>

      {/* Step navigation sheet */}
      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto p-0">
          <SheetHeader className="border-b-2 border-primary px-4 pb-3 pt-5">
            <SheetTitle className="text-lg font-bold">All Steps</SheetTitle>
          </SheetHeader>
          <div className="divide-y-2 divide-primary/15">
            {checklistItems.map((item, idx) => {
              const resp = responses[item.id]
              const isCurrent = idx === currentIndex
              const isHeader = item.item_type === "phase_header"
              const stepStatus = resp?.status ?? null
              const statusColors: Record<string, string> = {
                Pass: "text-green-800",
                Fail: "text-red-700",
                "N/A": "text-gray-700",
                Blocked: "text-orange-700",
                "Up For Review": "text-amber-800",
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleJumpToStep(idx)}
                  data-track="Jump to step"
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                    isCurrent
                      ? isHeader
                        ? "bg-brand-lavender-lightest"
                        : "bg-brand-sage-lightest"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary text-sm font-bold ${
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                    }`}
                  >
                    {isHeader ? <Bookmark className="h-3.5 w-3.5" /> : item.step_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {isHeader && item.header_label ? (
                        <span className="mr-1.5 text-xs font-bold text-primary">
                          {item.header_label}
                        </span>
                      ) : null}
                      {item.action}
                    </p>
                    {isHeader ? (
                      <span className="text-sm font-medium text-gray-700">Section header</span>
                    ) : previewMode ? (
                      <span className="text-sm font-medium text-gray-700">Preview only</span>
                    ) : stepStatus ? (
                      <span className={`text-sm font-bold ${statusColors[stepStatus] ?? "text-gray-700"}`}>
                        {stepStatus}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">Not answered</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Navigation */}
      <div className="mt-6 space-y-2 border-t-2 border-primary pt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className={`${currentIndex === 0 ? TESTER_BTN_DISABLED : TESTER_BTN_OUTLINE} px-4 py-3 text-base`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {isLastStep && previewMode ? (
            <Link
              href={`/test/${project.slug}`}
              className={`${TESTER_BTN_PRIMARY} flex-1 px-6 py-3 text-base`}
            >
              Register to Start Testing
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              aria-disabled={submitDisabled}
              className={`${!submitDisabled ? TESTER_BTN_PRIMARY : TESTER_BTN_DISABLED} flex-1 px-6 py-3 text-base`}
            >
              <Flag className="h-4 w-4" />
              {isMarkingComplete ? "Submitting…" : "Submit Test"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={nextDisabled || isAdvancing}
              aria-disabled={nextDisabled || isAdvancing}
              className={`${!nextDisabled && !isAdvancing ? TESTER_BTN_PRIMARY : TESTER_BTN_DISABLED} flex-1 px-6 py-3 text-base`}
            >
              {isAdvancing ? "Saving…" : "Next"}
              {!isAdvancing && <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Helper text */}
        {isLastStep && (!allAnswered || stepsMissingEvidence.length > 0) ? (
          <p className="text-center text-sm font-medium text-gray-800">
            {!isHeaderStep && currentCommentMissing
              ? "Add a comment or screenshot before submitting."
              : stepsMissingEvidence.length > 0
                ? `${stepsMissingEvidence.length} earlier step${stepsMissingEvidence.length === 1 ? "" : "s"} need a comment or screenshot. Open the step list to go back and add one.`
                : `${completedCount} of ${totalAnswerable} steps answered. Finish all to submit.`}
          </p>
        ) : nextDisabled && !isLastStep ? (
          <p className="text-center text-sm font-medium text-gray-800">
            {currentCommentMissing
              ? "Add a comment or screenshot before continuing."
              : "Choose a status (Pass / Fail / N/A / Blocked / Up For Review) to continue."}
          </p>
        ) : null}
        {completeError && (
          <p className="text-center text-sm font-bold text-red-700">{completeError}</p>
        )}
      </div>
    </div>
  )
}
