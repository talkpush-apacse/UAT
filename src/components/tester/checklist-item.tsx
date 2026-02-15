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

/** Check if a URL points to an image file */
function isImageUrl(url: string): boolean {
  // Check common image extensions (ignoring query params)
  if (/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) return true
  // Check common image hosting patterns
  if (/\/(image|img|photo|screenshot)\//i.test(url)) return true
  // Supabase storage with image content types
  if (/supabase.*\/storage\/.*\.(png|jpe?g|gif|webp)/i.test(url)) return true
  return false
}

/** Get card styling based on completion status */
function getCardStyles(status: string | null): string {
  if (!status) {
    // Unanswered — subtle blue left border to signal "needs attention"
    return "border-l-4 border-l-blue-200 bg-white"
  }
  switch (status) {
    case "Pass":
      return "border-l-4 border-l-green-500 bg-green-50/50"
    case "Fail":
      return "border-l-4 border-l-red-500 bg-red-50/50"
    case "N/A":
      return "border-l-4 border-l-gray-400 bg-gray-50/50"
    case "Blocked":
      return "border-l-4 border-l-amber-500 bg-amber-50/50"
    default:
      return "border-l-4 border-l-blue-200 bg-white"
  }
}

export default function ChecklistItem({
  item,
  testerId,
  response,
  attachments,
  onResponseUpdate,
  talkpushLoginLink,
}: {
  item: ChecklistItemData
  testerId: string
  response: ResponseData | null
  attachments: AttachmentData[]
  onResponseUpdate: (itemId: string, response: ResponseData) => void
  talkpushLoginLink?: string | null
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

  const hasImageSample = item.view_sample && isImageUrl(item.view_sample)
  const hasNonImageSample = item.view_sample && !isImageUrl(item.view_sample)

  // Comment prompt text based on status
  const commentPrompt = status === "Fail"
    ? "Please describe the issue you encountered"
    : status === "Blocked"
      ? "Please describe what is blocking this step"
      : "Add a comment..."

  return (
    <Card className={getCardStyles(status)}>
      <CardContent className="py-4">
        {/* === HEADER LINE === */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {item.view_sample ? "\uD83D\uDCF7 " : ""}Step {item.step_number}
            </span>
            {item.crm_module && (
              <Badge variant="outline" className="text-xs">{item.crm_module}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-red-600">Error — tap to retry</span>
            )}
          </div>
        </div>

        {/* === INSTRUCTION ZONE === */}
        <p className="text-base leading-relaxed mb-4">{item.action}</p>

        {/* === VISUAL REFERENCE (image preview) === */}
        {hasImageSample && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Reference — what it should look like:
            </p>
            <a
              href={item.view_sample!}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.view_sample!}
                alt={`Reference for Step ${item.step_number}`}
                className="max-h-[200px] rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer object-contain"
                loading="lazy"
              />
              <span className="text-xs text-blue-600 mt-1 inline-block hover:underline">
                Click to view full size
              </span>
            </a>
          </div>
        )}

        {/* === NON-IMAGE REFERENCE LINK === */}
        {hasNonImageSample && (
          <div className="mb-4">
            <a
              href={item.view_sample!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <span>View Reference</span>
              <span className="text-xs">↗</span>
            </a>
          </div>
        )}

        {/* === TALKPUSH LOGIN LINK === */}
        {talkpushLoginLink && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">Talkpush Login Link:</p>
            <a
              href={talkpushLoginLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {talkpushLoginLink}
            </a>
          </div>
        )}

        {/* === STATUS BUTTONS === */}
        <div className="flex gap-2 mb-4">
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

        {/* === COMMENT SECTION === */}
        {!showComment && !status && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add comment
          </button>
        )}
        {(showComment || status === "Fail" || status === "Blocked") && (
          <div>
            {(status === "Fail" || status === "Blocked") && (
              <p className={`text-xs font-medium mb-1 ${status === "Fail" ? "text-red-600" : "text-amber-600"}`}>
                {commentPrompt}
              </p>
            )}
            <Textarea
              placeholder={commentPrompt}
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        )}
        {/* Show "Add comment" for completed non-Fail/Blocked if comment not yet shown */}
        {!showComment && status && status !== "Fail" && status !== "Blocked" && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add comment
          </button>
        )}

        {/* === FILE UPLOAD === */}
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
