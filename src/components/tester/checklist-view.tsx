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
}

interface Tester {
  id: string
  name: string
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

  // Group items by path, then by actor
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, ChecklistItemData[]>> = {}

    checklistItems.forEach((item) => {
      const pathKey = item.path || "General"
      if (!groups[pathKey]) groups[pathKey] = {}
      if (!groups[pathKey][item.actor]) groups[pathKey][item.actor] = []
      groups[pathKey][item.actor].push(item)
    })

    return groups
  }, [checklistItems])

  const pathOrder = ["Happy", "Non-Happy", "General"]

  const handleResponseUpdate = (itemId: string, response: ResponseData) => {
    setResponses((prev) => ({ ...prev, [itemId]: response }))
  }

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

      {/* Checklist Groups */}
      <div className="mt-6 space-y-8">
        {pathOrder.map((path) => {
          const actors = grouped[path]
          if (!actors) return null

          return (
            <div key={path}>
              <h2 className="text-lg font-semibold mb-4 text-primary">
                {path === "General" ? "General" : `${path} Path`}
              </h2>

              {Object.entries(actors).map(([actor, items]) => (
                <div key={`${path}-${actor}`} className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    {actor}
                  </h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        testerId={tester.id}
                        response={responses[item.id] || null}
                        attachments={initialAttachments.filter(
                          (a) => responses[item.id] && a.response_id === responses[item.id].id
                        )}
                        onResponseUpdate={handleResponseUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
