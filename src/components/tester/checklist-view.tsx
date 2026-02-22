"use client"

import { useState, useMemo, useEffect, useId } from "react"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ChevronDown, ChevronUp, Search, Mail, LogIn, Flag, CheckCircle2 } from "lucide-react"
import ChecklistItem from "./checklist-item"
import { markTestComplete } from "@/lib/actions/testers"

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
}

interface Tester {
  id: string
  name: string
  test_completed?: string | null
}

/** Build sequential sections based on the order items appear in the file.
 *  A new section starts whenever the path OR actor changes from the previous item.
 *
 *  Issue #4 — disambiguate duplicate actor headings by appending an ordinal
 *  suffix to any heading that has already appeared earlier in the list.
 *  e.g. the second "Talkpush" section becomes "Talkpush (2)".
 */
interface Section {
  path: string
  actor: string
  displayActor: string   // may differ from actor when disambiguated
  items: ChecklistItemData[]
}

function buildSections(items: ChecklistItemData[]): Section[] {
  const sections: Section[] = []
  const actorOccurrences: Record<string, number> = {}

  items.forEach((item) => {
    const path = item.path || "General"
    const actor = item.actor
    const last = sections[sections.length - 1]

    if (!last || last.path !== path || last.actor !== actor) {
      // Count how many times this exact actor has appeared before
      actorOccurrences[actor] = (actorOccurrences[actor] || 0) + 1
      const occurrence = actorOccurrences[actor]
      const displayActor = occurrence > 1 ? `${actor} (${occurrence})` : actor
      sections.push({ path, actor, displayActor, items: [item] })
    } else {
      last.items.push(item)
    }
  })

  return sections
}

export default function ChecklistView({
  project,
  tester,
  checklistItems,
  responses: initialResponses,
  attachments: initialAttachments,
  testCompleted = null,
}: {
  project: Project
  tester: Tester
  checklistItems: ChecklistItemData[]
  responses: ResponseData[]
  attachments: AttachmentData[]
  testCompleted?: string | null
}) {
  const [responses, setResponses] = useState<Record<string, ResponseData>>(() => {
    const map: Record<string, ResponseData> = {}
    initialResponses.forEach((r) => {
      map[r.checklist_item_id] = r
    })
    return map
  })

  const [isTestComplete, setIsTestComplete] = useState(testCompleted === "Yes")
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true)
    const result = await markTestComplete(tester.id)
    if (!result.error) {
      setIsTestComplete(true)
    }
    setIsMarkingComplete(false)
  }

  const completedCount = useMemo(() => {
    return Object.values(responses).filter((r) => r.status !== null).length
  }, [responses])

  const totalCount = checklistItems.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Issue #3 — CTA is only active when every step has a status
  const allStepsCompleted = totalCount > 0 && completedCount === totalCount

  // Build sections in the original file order
  const sections = useMemo(() => buildSections(checklistItems), [checklistItems])

  // Find the first Talkpush actor step to show the login link
  const firstTalkpushItemId = useMemo(() => {
    const talkpushItem = checklistItems.find((item) => item.actor === "Talkpush")
    return talkpushItem?.id || null
  }, [checklistItems])

  // "Before You Begin" guide — collapsed state persisted per project
  const guideStorageKey = `uat-guide-collapsed-${project.id}`
  const [isGuideOpen, setIsGuideOpen] = useState(true)

  // Issue #8 — stable IDs for aria-controls
  const guideBodyId = useId()

  useEffect(() => {
    const stored = localStorage.getItem(guideStorageKey)
    if (stored === "true") setIsGuideOpen(false)
  }, [guideStorageKey])

  const toggleGuide = () => {
    setIsGuideOpen((prev) => {
      const next = !prev
      localStorage.setItem(guideStorageKey, next ? "false" : "true")
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
            <h1 className="font-semibold text-lg sm:text-xl text-gray-900 truncate">{project.company_name}</h1>
            <p className="text-sm text-gray-500">Hi {tester.name}</p>
          </div>
          {/* Issue #5: keep fraction counter only; removed "X% complete" text */}
          <p className="text-sm sm:text-base font-semibold text-emerald-700 flex-shrink-0 ml-4">
            {completedCount} / {totalCount}
          </p>
        </div>
        {/* Issue #7: ARIA attributes on progress bar; Issue #5: removed standalone "X%" label */}
        <Progress
          value={progressPct}
          className="h-2.5"
          aria-label="Test completion progress"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
        />
      </div>

      {/* Before You Begin — collapsible guide */}
      <div className="mt-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm overflow-hidden">
          {/* Issue #8: aria-expanded, aria-label, aria-controls on toggle button */}
          <button
            onClick={toggleGuide}
            aria-expanded={isGuideOpen}
            aria-controls={guideBodyId}
            aria-label={isGuideOpen ? "Collapse instructions" : "Expand instructions"}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-sm font-medium text-emerald-800">Before You Begin</span>
            </div>
            {isGuideOpen ? (
              <ChevronUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Collapsible body */}
          <div
            id={guideBodyId}
            className={`transition-all duration-300 ease-in-out ${
              isGuideOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            } overflow-hidden`}
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Usage instructions */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">How to use this checklist</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#8226;</span>
                    Follow each step in order from top to bottom
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#8226;</span>
                    Mark each step as <span className="font-medium text-green-600">Pass</span>, <span className="font-medium text-red-500">Fail</span>, <span className="font-medium text-gray-500">N/A</span>, or <span className="font-medium text-amber-600">Up For Review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#8226;</span>
                    Add comments or attach screenshots when something fails
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#8226;</span>
                    Your progress is saved automatically
                  </li>
                </ul>
              </div>

              {/* Troubleshooting */}
              <div className="border-t border-emerald-100 pt-3">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Troubleshooting</p>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                    <Search className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      If unable to search profile in Talkpush, make sure to set your filter to <span className="font-medium text-gray-800">&quot;All Campaigns&quot;</span> and <span className="font-medium text-gray-800">&quot;All Folders&quot;</span> on the top section.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                    <LogIn className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
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

      {/* Checklist — rendered in original file order */}
      <div className="mt-6 space-y-6" id="checklist-sections">
        {sections.map((section, sIdx) => {
          const sectionCompleted = section.items.filter(
            (i) => responses[i.id]?.status !== null && responses[i.id]?.status !== undefined
          ).length
          const sectionTotal = section.items.length
          const sectionPct = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0

          return (
            <div key={`section-${sIdx}`}>
              {/* Actor section with progress — Issue #4: uses displayActor (disambiguated) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {section.displayActor}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${sectionCompleted === sectionTotal && sectionTotal > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {sectionCompleted} of {sectionTotal}
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${sectionCompleted === sectionTotal && sectionTotal > 0 ? "bg-green-500" : "bg-emerald-600"}`}
                        style={{ width: `${sectionPct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      testerId={tester.id}
                      response={responses[item.id] || null}
                      attachments={initialAttachments.filter(
                        (a) => responses[item.id] && a.response_id === responses[item.id].id
                      )}
                      onResponseUpdate={handleResponseUpdate}
                      talkpushLoginLink={
                        item.id === firstTalkpushItemId
                          ? project.talkpush_login_link
                          : null
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {/* Mark Test Complete — Issue #3: disabled until all steps have a status */}
        {checklistItems.length > 0 && (
          <div className="pt-4 pb-6 border-t border-gray-200 mt-2">
            {isTestComplete ? (
              <div className="flex items-center justify-center gap-2.5 rounded-xl bg-green-50 border border-green-200 py-5 px-6">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-700">Test Marked Complete</span>
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
                        ? "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <Flag className="h-4 w-4" />
                  {isMarkingComplete ? "Saving…" : "Mark My Test as Complete"}
                </button>
                {/* Issue #3: dynamic helper text */}
                <p className="text-xs text-gray-400 text-center mt-2">
                  {allStepsCompleted
                    ? "All steps completed — ready to mark as complete"
                    : `${completedCount} of ${totalCount} steps completed — finish all steps before marking complete`
                  }
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
