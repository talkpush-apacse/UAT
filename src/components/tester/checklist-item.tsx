"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import FileUpload from "./file-upload"

interface ChecklistItemData {
  id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
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

type SaveStatus = "idle" | "saving" | "saved" | "error"

const STATUS_OPTIONS = ["Pass", "Fail", "N/A", "Blocked"] as const

const STATUS_STYLES: Record<string, { active: string; inactive: string }> = {
  Pass: {
    active: "bg-green-600 text-white border-green-600",
    inactive: "border-green-300 text-green-700 hover:bg-green-50",
  },
  Fail: {
    active: "bg-red-600 text-white border-red-600",
    inactive: "border-red-300 text-red-700 hover:bg-red-50",
  },
  "N/A": {
    active: "bg-gray-600 text-white border-gray-600",
    inactive: "border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  Blocked: {
    active: "bg-amber-600 text-white border-amber-600",
    inactive: "border-amber-300 text-amber-700 hover:bg-amber-50",
  },
}

export default function ChecklistItem({
  item,
  testerId,
  response,
  attachments,
  onResponseUpdate,
}: {
  item: ChecklistItemData
  testerId: string
  response: ResponseData | null
  attachments: AttachmentData[]
  onResponseUpdate: (itemId: string, response: ResponseData) => void
}) {
  const [status, setStatus] = useState<string | null>(response?.status || null)
  const [comment, setComment] = useState(response?.comment || "")
  const [responseId, setResponseId] = useState(response?.id || null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [showComment, setShowComment] = useState(
    !!response?.comment || status === "Fail" || status === "Blocked"
  )

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef(createClient())

  const save = useCallback(
    async (newStatus: string | null, newComment: string) => {
      setSaveStatus("saving")

      try {
        const supabase = supabaseRef.current

        const { data, error } = await supabase
          .from("responses")
          .upsert(
            {
              tester_id: testerId,
              checklist_item_id: item.id,
              status: newStatus,
              comment: newComment || null,
            },
            { onConflict: "tester_id,checklist_item_id" }
          )
          .select("id")
          .single()

        if (error) {
          setSaveStatus("error")
          return
        }

        const newResponseId = data?.id || responseId
        if (data?.id) setResponseId(data.id)

        onResponseUpdate(item.id, {
          id: newResponseId!,
          tester_id: testerId,
          checklist_item_id: item.id,
          status: newStatus,
          comment: newComment || null,
        })

        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch {
        setSaveStatus("error")
      }
    },
    [testerId, item.id, responseId, onResponseUpdate]
  )

  const handleStatusChange = (newStatus: string) => {
    const finalStatus = newStatus === status ? null : newStatus
    setStatus(finalStatus)

    if (finalStatus === "Fail" || finalStatus === "Blocked") {
      setShowComment(true)
    }

    // Save immediately on status change
    if (debounceRef.current) clearTimeout(debounceRef.current)
    save(finalStatus, comment)
  }

  const handleCommentChange = (value: string) => {
    setComment(value)

    // Debounce comment saves
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save(status, value)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <Card className={status ? "border-l-4 " + (
      status === "Pass" ? "border-l-green-500" :
      status === "Fail" ? "border-l-red-500" :
      status === "N/A" ? "border-l-gray-400" :
      "border-l-amber-500"
    ) : ""}>
      <CardContent className="py-4">
        {/* Step header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                Step {item.step_number}
              </span>
              {item.crm_module && (
                <Badge variant="outline" className="text-xs">{item.crm_module}</Badge>
              )}
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-600">Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-red-600">Error saving</span>
              )}
            </div>
            <p className="text-sm">{item.action}</p>
            {item.view_sample && (
              <a
                href={item.view_sample}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View Sample
              </a>
            )}
          </div>
        </div>

        {/* Status buttons */}
        <div className="flex gap-2 mb-3">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = status === opt
            const styles = STATUS_STYLES[opt]
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleStatusChange(opt)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md border transition-colors
                  min-h-[44px] flex-1
                  ${isActive ? styles.active : styles.inactive}
                `}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {/* Comment toggle + textarea */}
        {!showComment && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add comment
          </button>
        )}
        {showComment && (
          <Textarea
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            rows={2}
            className="text-sm mt-1"
          />
        )}

        {/* File upload */}
        {responseId && (
          <div className="mt-3">
            <FileUpload
              responseId={responseId}
              testerId={testerId}
              projectId={item.id}
              existingAttachments={attachments}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
