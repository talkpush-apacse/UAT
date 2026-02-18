"use client"

import { useState, useMemo, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ChevronDown, ChevronUp, Search, Mail } from "lucide-react"
import ChecklistItem from "./checklist-item"

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
}

/** Build sequential sections based on the order items appear in the file.
 *  A new section starts whenever the path OR actor changes from the previous item. */
interface Section {
  path: string
  actor: string
  items: ChecklistItemData[]
}

function buildSections(items: ChecklistItemData[]): Section[] {
  const sections: Section[] = []

  items.forEach((item) => {
    const path = item.path || "General"
    const actor = item.actor
    const last = sections[sections.length - 1]

    if (!last || last.path !== path || last.actor !== actor) {
      sections.push({ path, actor, items: [item] })
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
}: {
  project: Project
  tester: Tester
  checklistItems: ChecklistItemData[]
  responses: ResponseData[]
  attachments: AttachmentData[]
}) {
  const [responses, setResponses] = useState<Record<string, ResponseData>>(() => {
    const map: Record<string, ResponseData> = {}
    initialResponses.forEach((r) => {
      map[r.checklist_item_id] = r
    })
    return map
  })

  const completedCount = useMemo(() => {
    return Object.values(responses).filter((r) => r.status !== null).length
  }, [responses])

  const totalCount = checklistItems.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

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
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-5 pb-4 px-4 sm:px-6 -mx-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h1 className="font-semibold text-lg sm:text-xl text-gray-900 truncate">{project.company_name}</h1>
            <p className="text-sm text-gray-500">Hi {tester.name}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-sm sm:text-base font-semibold text-emerald-700">{completedCount} / {totalCount}</p>
            <p className="text-xs text-gray-400">{progressPct}% complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="h-2.5 flex-1" />
          <span className="text-xs font-medium text-gray-500 flex-shrink-0 w-10 text-right">{progressPct}%</span>
        </div>
      </div>

      {/* Before You Begin — collapsible guide */}
      <div className="mt-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm overflow-hidden">
          {/* Header — always visible */}
          <button
            onClick={toggleGuide}
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
                    Mark each step as <span className="font-medium text-green-600">Pass</span>, <span className="font-medium text-red-500">Fail</span>, or <span className="font-medium text-gray-500">Skip</span>
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
                      If unable to search, make sure to set your filter to <span className="font-medium text-gray-800">&quot;All Campaigns&quot;</span> and <span className="font-medium text-gray-800">&quot;All Folders&quot;</span> on the top section.
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
      <div className="mt-6 space-y-6">
        {sections.map((section, sIdx) => {
          const sectionCompleted = section.items.filter(
            (i) => responses[i.id]?.status !== null && responses[i.id]?.status !== undefined
          ).length
          const sectionTotal = section.items.length
          const sectionPct = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0

          return (
            <div key={`section-${sIdx}`}>
              {/* Actor section with progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {section.actor}
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
      </div>
    </div>
  )
}
