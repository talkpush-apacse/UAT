"use client"

import { useState, useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import ChecklistItem from "./checklist-item"

interface ChecklistItemData {
  id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
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

  const handleResponseUpdate = (itemId: string, response: ResponseData) => {
    setResponses((prev) => ({ ...prev, [itemId]: response }))
  }

  // Track which path headings we've already rendered so we only show them once
  let lastRenderedPath: string | null = null

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-50 pt-4 pb-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-semibold text-lg">{project.company_name}</h1>
            <p className="text-sm text-muted-foreground">Hi {tester.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{completedCount} / {totalCount}</p>
            <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
          </div>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Checklist — rendered in original file order */}
      <div className="mt-6 space-y-6">
        {sections.map((section, sIdx) => {
          const sectionCompleted = section.items.filter(
            (i) => responses[i.id]?.status !== null && responses[i.id]?.status !== undefined
          ).length
          const sectionTotal = section.items.length
          const sectionPct = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0

          // Show a path heading when the path changes
          const showPathHeading = section.path !== lastRenderedPath
          lastRenderedPath = section.path

          return (
            <div key={`section-${sIdx}`}>
              {/* Path heading — only when path changes */}
              {showPathHeading && (
                <h2 className="text-lg font-semibold mb-4 mt-8 first:mt-0 text-primary">
                  {section.path === "General" ? "General" : `${section.path} Path`}
                </h2>
              )}

              {/* Actor section with progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {section.actor}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${sectionCompleted === sectionTotal && sectionTotal > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {sectionCompleted} of {sectionTotal}
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${sectionCompleted === sectionTotal && sectionTotal > 0 ? "bg-green-500" : "bg-blue-400"}`}
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
