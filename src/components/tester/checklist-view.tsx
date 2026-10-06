"use client"

import { useState, useMemo, useEffect, useId, useCallback, useRef } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { ChevronDown, ChevronUp, Flag, CheckCircle2, ArrowRight, AlertTriangle, ArrowDown } from "lucide-react"
import ChecklistItem from "./checklist-item"
import PhaseHeaderCard from "./phase-header-card"
import { markTestComplete } from "@/lib/actions/testers"
import { getStepsMissingEvidence } from "@/lib/utils/response-validation"
import ChecklistWizardView from "./checklist-wizard-view"
import TesterHeader from "./tester-header"
import { TESTER_BTN_DISABLED, TESTER_BTN_OUTLINE, TESTER_BTN_PRIMARY, TESTER_LINK } from "./tester-ui"
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
          {i > 0 && <span className="text-gray-500"> · </span>}
          <button
            type="button"
            onClick={() => scrollToStep(item.step_number)}
            className={TESTER_LINK}
          >
            Step {item.step_number}
          </button>
        </span>
      ))}
      {hidden > 0 && <span className="text-gray-700"> and {hidden} more</span>}
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
      <TesterHeader
        clientLogoUrl={project.client?.logo_url}
        companyName={project.company_name}
        subtitle={previewMode ? "UAT steps preview" : `Hi ${tester.name}`}
        right={previewMode ? `${totalCount} steps` : `${completedCount} / ${totalCount}`}
      >
        {!previewMode && (
          <Progress
            value={progressPct}
            className="h-3.5 border-2 border-primary bg-white"
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
            className={`mt-2.5 inline-flex items-center gap-1 text-sm ${TESTER_LINK}`}
          >
            Next unanswered: Step {unansweredItems[0].step_number}
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
        {failedSaveItems.length > 0 && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {failedSaveItems.length === 1 ? "1 answer didn't save" : `${failedSaveItems.length} answers didn't save`}
              {" — press Retry on "}
              <StepJumpLinks items={failedSaveItems} max={5} />
            </p>
          </div>
        )}
      </TesterHeader>


      {/* How to answer — one-line rule always visible, definitions behind a toggle */}
      <div className="mt-4 rounded-xl border-2 border-primary bg-white">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <p className="text-sm font-medium leading-relaxed text-primary">
            <span className="font-bold">How to answer: </span>
            mark each step Pass, Fail, N/A, Blocked or Up for review. Fail, Blocked and Review need a comment or screenshot.
          </p>
          <button
            type="button"
            onClick={toggleGuide}
            aria-expanded={isGuideOpen}
            aria-controls={guideBodyId}
            data-track={isGuideOpen ? "Collapse instructions" : "Expand instructions"}
            className={`${TESTER_BTN_OUTLINE} flex-shrink-0 rounded-lg px-3 py-1.5 text-sm`}
          >
            {isGuideOpen ? "Hide" : "Details"}
            {isGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div
          id={guideBodyId}
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isGuideOpen ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-4 border-t-2 border-primary px-4 py-4 text-sm font-medium leading-relaxed text-gray-800">
            <p>Work through the steps in order, top to bottom. Add a comment or screenshot whenever something fails or looks off.</p>
            <ul className="space-y-1.5">
              <li><span className="font-bold text-green-800">Pass</span> — it worked exactly as described.</li>
              <li><span className="font-bold text-red-700">Fail</span> — something went wrong or didn&apos;t match the expected result.</li>
              <li><span className="font-bold text-gray-700">N/A</span> — this step doesn&apos;t apply to your test scenario.</li>
              <li><span className="font-bold text-orange-700">Blocked</span> — you can&apos;t test it because an earlier step failed. Say which one.</li>
              <li><span className="font-bold text-amber-800">Up for review</span> — you&apos;re unsure if it passed. An admin will take a look.</li>
            </ul>
            <p>
              <span className="font-bold text-primary">Your progress saves automatically.</span> Close this page and come back to the same link anytime.
            </p>
            <div>
              <p className="mb-1.5 font-bold text-primary">Troubleshooting</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Can&apos;t find a profile in Talkpush? Set the filters at the top to &quot;All Campaigns&quot; and &quot;All Folders&quot;.</li>
                <li>Can&apos;t log in? Check you&apos;ve activated your account from the Talkpush invitation email.</li>
                <li>Email not arriving? Wait 2-3 minutes, refresh, and check your Spam folder.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist — flat sequential list, no actor section grouping */}
      <div className="mt-6 space-y-4" id="checklist-sections">
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

        {/* Submit Test — disabled until every step has a status */}
        {!previewMode && checklistItems.length > 0 && (
          <div className="mt-2 border-t-2 border-primary pb-6 pt-5">
            {isTestComplete ? (
              <div className="space-y-3">
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
            ) : (
              <>
                <button
                  onClick={handleMarkComplete}
                  disabled={!allStepsCompleted || isMarkingComplete}
                  aria-disabled={!allStepsCompleted || isMarkingComplete}
                  className={`${
                    allStepsCompleted && !isMarkingComplete ? TESTER_BTN_PRIMARY : TESTER_BTN_DISABLED
                  } w-full px-6 py-4 text-base`}
                >
                  <Flag className="h-4 w-4" />
                  {isMarkingComplete ? "Submitting…" : "Submit Test"}
                </button>
                <div className="mt-3 space-y-1 text-center text-sm font-medium text-gray-800">
                  {allStepsCompleted ? (
                    <p>All steps answered. Ready to submit.</p>
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
                  <p className="mt-2 text-center text-sm font-bold text-red-700">{completeError}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
