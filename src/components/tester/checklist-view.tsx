"use client"

import { useState, useMemo, useEffect, useId, useCallback, useRef } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ChevronDown, ChevronUp, Search, Mail, LogIn, Flag, CheckCircle2, ArrowRight, CheckCircle, XCircle, MinusCircle, Ban, HelpCircle, Eye, AlertTriangle, ArrowDown } from "lucide-react"
import ChecklistItem from "./checklist-item"
import PhaseHeaderCard from "./phase-header-card"
import { markTestComplete } from "@/lib/actions/testers"
import { getStepsMissingEvidence } from "@/lib/utils/response-validation"
import ChecklistWizardView from "./checklist-wizard-view"
import { ClientLogosHeader } from "./client-logos-header"
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

type ChecklistViewProps = {
  project: Project
  tester: Tester
  checklistItems: ChecklistItemData[]
  responses: ResponseData[]
  attachments: AttachmentData[]
  testCompleted?: string | null
  previewMode?: boolean
}

function scrollToStep(stepNumber: number | null) {
  if (stepNumber == null) return
  document.getElementById(`step-${stepNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

// Renders "Step 3 · Step 8 · …" as jump links, capped so a long list stays readable.
function StepJumpLinks({ items, max = 8 }: { items: ChecklistItemData[]; max?: number }) {
  const shown = items.slice(0, max)
  const hidden = items.length - shown.length
  return (
    <>
      {shown.map((item, i) => (
        <span key={item.id}>
          {i > 0 && <span className="text-gray-300"> · </span>}
          <button
            type="button"
            onClick={() => scrollToStep(item.step_number)}
            className="font-medium text-brand-sage-darker underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lavender-darker rounded"
          >
            Step {item.step_number}
          </button>
        </span>
      ))}
      {hidden > 0 && <span className="text-gray-500"> and {hidden} more</span>}
    </>
  )
}

export default function ChecklistView(props: ChecklistViewProps) {
  if (props.project.wizard_mode) {
    return <ChecklistWizardView {...props} />
  }
  return <ClassicChecklistView {...props} />
}

function ClassicChecklistView({
  project,
  tester,
  checklistItems,
  responses: initialResponses,
  attachments: initialAttachments,
  testCompleted = null,
  previewMode = false,
}: ChecklistViewProps) {
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

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true)
    setCompleteError(null)
    try {
      const result = await markTestComplete(tester.id)
      if (!result.error) {
        setIsTestComplete(true)
        trackTestCompleted(project.slug, "classic", stepItems, responses)
      } else {
        setCompleteError(result.error)
        trackMarkCompleteFailed(project.slug, "classic", result.error)
      }
    } catch (err) {
      // Server action unreachable (e.g. offline) — previously the button
      // stayed stuck on "Saving…" with no message.
      setCompleteError("Couldn't reach the server. Check your connection and try again.")
      trackMarkCompleteFailed(project.slug, "classic", err)
    }
    setIsMarkingComplete(false)
  }

  const handleAttachmentsChange = (responseId: string, newAttachments: AttachmentData[]) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.response_id !== responseId),
      ...newAttachments,
    ])
  }

  // Phase headers don't count toward progress — they have no status to set.
  const stepItems = useMemo(
    () => checklistItems.filter((i) => i.item_type !== "phase_header"),
    [checklistItems]
  )

  const completedCount = useMemo(() => {
    const stepIds = new Set(stepItems.map((i) => i.id))
    return Object.values(responses).filter(
      (r) => r.status !== null && stepIds.has(r.checklist_item_id)
    ).length
  }, [responses, stepItems])

  const totalCount = stepItems.length

  // 1-based position among answerable steps (phase headers excluded), for analytics
  const stepPositions = useMemo(
    () => new Map(stepItems.map((item, i) => [item.id, i + 1])),
    [stepItems]
  )
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Fail/Blocked/Up For Review steps must have a comment or an attachment before completion.
  const stepsMissingEvidence = useMemo(
    () => getStepsMissingEvidence(Object.values(responses), attachments),
    [responses, attachments]
  )

  // Issue #3 — CTA is only active when every step has a status and no flagged step is missing evidence
  const allStepsCompleted =
    totalCount > 0 && completedCount === totalCount && stepsMissingEvidence.length === 0

  const unansweredItems = useMemo(
    () => stepItems.filter((i) => responses[i.id]?.status == null),
    [stepItems, responses]
  )
  const missingEvidenceItems = useMemo(() => {
    const ids = new Set(stepsMissingEvidence)
    return stepItems.filter((i) => ids.has(i.id))
  }, [stepItems, stepsMissingEvidence])

  // Steps whose last save failed — surfaced as a banner so they aren't missed.
  const [failedSaveIds, setFailedSaveIds] = useState<Set<string>>(() => new Set())
  const handleSaveFailedChange = useCallback((itemId: string, failed: boolean) => {
    setFailedSaveIds((prev) => {
      if (prev.has(itemId) === failed) return prev
      const next = new Set(prev)
      if (failed) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }, [])
  const failedSaveItems = stepItems.filter((i) => failedSaveIds.has(i.id))

  // Find the first Talkpush actor *step* (not a phase header that defaults to Talkpush)
  // to show the login link.
  const firstTalkpushItemId = useMemo(() => {
    const talkpushItem = stepItems.find((item) => item.actor === "Talkpush")
    return talkpushItem?.id || null
  }, [stepItems])

  // "Before You Begin" guide — collapsed state persisted per project
  const guideStorageKey = `uat-guide-collapsed-${project.id}`
  const guideSeenKey = `uat-guide-seen-${project.id}`
  const [isGuideOpen, setIsGuideOpen] = useState(true)

  // Issue #8 — stable IDs for aria-controls
  const guideBodyId = useId()

  // Open on the first visit only; afterwards collapsed (a one-line legend
  // stays visible) unless the tester explicitly reopened it.
  const guideInitRef = useRef(false)
  useEffect(() => {
    // Ref guard: React dev mode runs effects twice, and the second run would
    // otherwise read the "seen" flag the first run just wrote.
    if (guideInitRef.current) return
    guideInitRef.current = true
    try {
      const stored = localStorage.getItem(guideStorageKey)
      const seen = localStorage.getItem(guideSeenKey) === "true"
      if (stored === "true" || (stored === null && seen)) setIsGuideOpen(false)
      localStorage.setItem(guideSeenKey, "true")
    } catch {
      // Storage unavailable (private mode) — keep the guide open.
    }
  }, [guideStorageKey, guideSeenKey])

  const toggleGuide = () => {
    setIsGuideOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(guideStorageKey, next ? "false" : "true")
      } catch {
        // Ignore — the toggle still works for this visit.
      }
      return next
    })
  }

  const handleResponseUpdate = (itemId: string, response: ResponseData) => {
    setResponses((prev) => ({ ...prev, [itemId]: response }))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Sticky Header — Issue #9 (already sticky); Issue #5: removed "X% complete" text and standalone "X%" label */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-5 pb-4 px-4 sm:px-6 -mx-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <ClientLogosHeader clientLogoUrl={project.client?.logo_url} />
            <h1 className="font-semibold text-lg sm:text-xl text-gray-900 truncate">{project.company_name}</h1>
            <p className="text-sm text-gray-500">
              {previewMode ? "UAT Steps Preview" : `Hi ${tester.name}`}
            </p>
          </div>
          {/* Issue #5: keep fraction counter only; removed "X% complete" text */}
          <p className="text-sm sm:text-base font-semibold text-brand-sage-darker flex-shrink-0 ml-4">
            {previewMode ? `${totalCount} steps` : `${completedCount} / ${totalCount}`}
          </p>
        </div>
        {/* Issue #7: ARIA attributes on progress bar; Issue #5: removed standalone "X%" label */}
        {!previewMode && (
          <Progress
            value={progressPct}
            className="h-2.5"
            aria-label="Test completion progress"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
          />
        )}
        {!previewMode && !isTestComplete && unansweredItems.length > 0 && completedCount > 0 && (
          <button
            type="button"
            onClick={() => scrollToStep(unansweredItems[0].step_number)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-sage-darker hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lavender-darker rounded"
          >
            Next unanswered: Step {unansweredItems[0].step_number}
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        )}
        {failedSaveItems.length > 0 && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              {failedSaveItems.length === 1 ? "1 answer didn't save" : `${failedSaveItems.length} answers didn't save`}
              {" — press Retry on "}
              <StepJumpLinks items={failedSaveItems} max={5} />
            </p>
          </div>
        )}
      </div>

      {previewMode && (
        <div className="mt-4 rounded-xl border border-brand-sage-lighter bg-brand-sage-lightest px-4 py-3 text-sm text-brand-sage-darker flex items-start gap-2.5">
          <Eye className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            You are previewing the UAT steps. Register when you are ready to save responses, upload screenshots, and submit your test.
          </p>
        </div>
      )}

      {/* Before You Begin — collapsible guide */}
      <div className="mt-4">
        <div className="rounded-xl border border-brand-lavender-lighter bg-brand-lavender-lightest shadow-sm overflow-hidden">
          {/* Toggle header — full row clickable, shows Hide/Show Guide label */}
          <button
            onClick={toggleGuide}
            aria-expanded={isGuideOpen}
            aria-controls={guideBodyId}
            aria-label={isGuideOpen ? "Collapse instructions" : "Expand instructions"}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-lavender-lighter/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-lavender-lighter flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-brand-lavender-darker" />
              </div>
              <span className="text-sm font-medium text-brand-lavender-darker">Before You Begin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-brand-lavender-darker">
                {isGuideOpen ? "Hide" : "Show Guide"}
              </span>
              {isGuideOpen ? (
                <ChevronUp className="w-4 h-4 text-brand-lavender-darker" />
              ) : (
                <ChevronDown className="w-4 h-4 text-brand-lavender-darker" />
              )}
            </div>
          </button>

          {!isGuideOpen && (
            <p className="px-4 pb-3 -mt-1 text-xs text-gray-600">
              Mark each step{" "}
              <span className="font-semibold text-green-700">Pass</span>,{" "}
              <span className="font-semibold text-red-600">Fail</span>,{" "}
              <span className="font-semibold text-gray-600">N/A</span>,{" "}
              <span className="font-semibold text-orange-600">Blocked</span> or{" "}
              <span className="font-semibold text-amber-600">Up For Review</span>. Fail, Blocked and Review need a comment or screenshot.
            </p>
          )}

          {/* Collapsible body */}
          <div
            id={guideBodyId}
            className={`transition-all duration-300 ease-in-out ${
              isGuideOpen ? "max-h-[680px] opacity-100" : "max-h-0 opacity-0"
            } overflow-hidden`}
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Usage instructions */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">How to use these UAT steps</p>
                <ul className="space-y-1.5 text-sm text-gray-600 mb-3">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-lavender mt-0.5">&#8226;</span>
                    Follow each step in order from top to bottom
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-lavender mt-0.5">&#8226;</span>
                    Add comments or attach screenshots when something fails or looks off
                  </li>
                </ul>

                {/* Status definitions — casual icon guide */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-green-700">Pass</span>
                      <span className="text-sm text-gray-600"> — The step worked exactly as described. No issues.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-red-600">Fail</span>
                      <span className="text-sm text-gray-600"> — Something went wrong or didn&apos;t match the expected result.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                    <MinusCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-gray-600">N/A</span>
                      <span className="text-sm text-gray-600"> — This step doesn&apos;t apply to your test scenario. Skip it.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                    <Ban className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-orange-600">Blocked</span>
                      <span className="text-sm text-gray-600"> — You can&apos;t test this step because a previous step failed. Tell us which step is blocking you.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                    <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-amber-600">Up For Review</span>
                      <span className="text-sm text-gray-600"> — You&apos;re unsure if this is a pass or fail. Flag it and an admin will review.</span>
                    </div>
                  </div>
                </div>

                {/* Autosave reassurance note */}
                <div className="mt-3 px-3 py-2.5 bg-brand-lavender-lighter/60 rounded-lg border border-brand-lavender-lighter">
                  <p className="text-sm text-brand-lavender-darker">
                    <span className="font-medium">Your progress is saved automatically.</span> You can close this page and come back to the same link anytime to continue where you left off.
                  </p>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="border-t border-brand-lavender-lighter pt-3">
                <p className="text-xs font-medium text-brand-lavender-darker uppercase tracking-wide mb-2">Troubleshooting</p>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                    <Search className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      If unable to search profile in Talkpush, make sure to set your filter to <span className="font-medium text-gray-800">&quot;All Campaigns&quot;</span> and <span className="font-medium text-gray-800">&quot;All Folders&quot;</span> on the top section.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                    <LogIn className="w-4 h-4 text-brand-sage mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      If unable to login, please check you have activated your account through an invitation email from Talkpush.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                    <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      If the email is not yet received, wait 2-3 minutes, refresh and check your Spam folder too.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist — flat sequential list, no actor section grouping */}
      <div className="mt-6 space-y-3" id="checklist-sections">
        {checklistItems.map((item) => {
          if (item.item_type === "phase_header") {
            return (
              <PhaseHeaderCard
                key={item.id}
                label={item.header_label}
                action={item.action}
                tip={item.tip}
              />
            )
          }
          return (
            <ChecklistItem
              key={item.id}
              item={item as ChecklistItemData & { step_number: number }}
              testerId={tester.id}
              response={responses[item.id] || null}
              attachments={attachments.filter(
                (a) => responses[item.id] && a.response_id === responses[item.id].id
              )}
              onResponseUpdate={handleResponseUpdate}
              onAttachmentsChange={handleAttachmentsChange}
              talkpushLoginLink={
                item.id === firstTalkpushItemId
                  ? project.talkpush_login_link
                  : null
              }
              previewMode={previewMode}
              trackingContext={{
                project_slug: project.slug,
                step_position: stepPositions.get(item.id) ?? 0,
                total_steps: totalCount,
                view_mode: "classic",
              }}
              onSaveFailedChange={handleSaveFailedChange}
            />
          )
        })}

        {/* Submit Test — Issue #3: disabled until all steps have a status */}
        {!previewMode && checklistItems.length > 0 && (
          <div className="pt-4 pb-6 border-t border-gray-200 mt-2">
            {isTestComplete ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5 rounded-xl bg-green-50 border border-green-200 py-5 px-6">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-green-700">Test Submitted</span>
                </div>
                <Link
                  href={`/test/${project.slug}/results?tester=${tester.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-sage-lighter bg-white py-3.5 px-6 text-sm font-semibold text-brand-sage-darker hover:bg-brand-sage-lightest hover:border-brand-sage transition-colors"
                >
                  View My Results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={handleMarkComplete}
                  disabled={!allStepsCompleted || isMarkingComplete}
                  aria-disabled={!allStepsCompleted || isMarkingComplete}
                  className={`w-full rounded-xl font-semibold py-4 px-6 text-sm transition-colors
                    flex items-center justify-center gap-2 shadow-sm
                    ${
                      allStepsCompleted && !isMarkingComplete
                        ? "bg-primary hover:bg-primary/90 active:bg-primary/80 text-white cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <Flag className="h-4 w-4" />
                  {isMarkingComplete ? "Submitting…" : "Submit Test"}
                </button>
                {/* Issue #3: dynamic helper text */}
                <div className="text-xs text-gray-500 text-center mt-2 space-y-1">
                  {allStepsCompleted ? (
                    <p>All steps answered — ready to submit</p>
                  ) : (
                    <>
                      {unansweredItems.length > 0 && (
                        <p>
                          {completedCount} of {totalCount} answered. Still to answer:{" "}
                          <StepJumpLinks items={unansweredItems} />
                        </p>
                      )}
                      {missingEvidenceItems.length > 0 && (
                        <p>
                          Add a comment or screenshot to:{" "}
                          <StepJumpLinks items={missingEvidenceItems} />
                        </p>
                      )}
                    </>
                  )}
                </div>
                {completeError && (
                  <p className="text-xs text-red-600 text-center mt-2">{completeError}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
