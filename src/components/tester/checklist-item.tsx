"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Eye, ExternalLink, ShieldCheck } from "lucide-react"
import FileUpload from "./file-upload"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import { saveAdminReview } from "@/lib/actions/admin-reviews"

interface ChecklistItemData {
  id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
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

const STATUS_OPTIONS = [
  { value: "Pass", label: "Pass" },
  { value: "Fail", label: "Fail" },
  { value: "N/A", label: "N/A" },
  { value: "Blocked", label: "Up For Review" },
] as const

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
  if (/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) return true
  if (/\/(image|img|photo|screenshot)\//i.test(url)) return true
  if (/supabase.*\/storage\/.*\.(png|jpe?g|gif|webp)/i.test(url)) return true
  return false
}

/** Check if a URL is a Descript share link */
function isDescriptUrl(url: string): boolean {
  return /^https:\/\/share\.descript\.com\/view\/[a-zA-Z0-9_-]+/.test(url)
}

/** Extract Google Drive file ID from a Drive share URL */
function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/** Get card styling based on completion status */
function getCardStyles(status: string | null): string {
  if (!status) {
    return "border-l-4 border-l-emerald-200 bg-white"
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
      return "border-l-4 border-l-emerald-200 bg-white"
  }
}

type ReviewSaveStatus = "idle" | "saving" | "saved" | "error"

export default function ChecklistItem({
  item,
  testerId,
  response,
  attachments,
  onResponseUpdate,
  talkpushLoginLink,
  isAdmin = false,
  adminReview = null,
}: {
  item: ChecklistItemData
  testerId: string
  response: ResponseData | null
  attachments: AttachmentData[]
  onResponseUpdate: (itemId: string, response: ResponseData) => void
  talkpushLoginLink?: string | null
  isAdmin?: boolean
  adminReview?: { behavior_type: string | null; resolution_status: string; notes: string | null } | null
}) {
  const [status, setStatus] = useState<string | null>(response?.status || null)
  const [comment, setComment] = useState(response?.comment || "")
  const [responseId, setResponseId] = useState(response?.id || null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [showComment, setShowComment] = useState(
    !!response?.comment || status === "Fail" || status === "Blocked"
  )

  // Admin review state — only used when isAdmin === true
  const [behaviorType, setBehaviorType] = useState<string | null>(adminReview?.behavior_type ?? null)
  const [resolutionStatus, setResolutionStatus] = useState<string>(
    adminReview?.resolution_status ?? "Not Yet Started"
  )
  const [reviewNotes, setReviewNotes] = useState<string>(adminReview?.notes ?? "")
  const [reviewSaveStatus, setReviewSaveStatus] = useState<ReviewSaveStatus>("idle")

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const reviewDebounceRef = useRef<NodeJS.Timeout | null>(null)
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

    if (debounceRef.current) clearTimeout(debounceRef.current)
    save(finalStatus, comment)
  }

  const handleCommentChange = (value: string) => {
    setComment(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save(status, value)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (reviewDebounceRef.current) clearTimeout(reviewDebounceRef.current)
    }
  }, [])

  // Admin review handler — saves immediately on button clicks (no debounce needed)
  const handleReviewChange = async (newBehavior: string | null, newStatus: string) => {
    setBehaviorType(newBehavior)
    setResolutionStatus(newStatus)
    setReviewSaveStatus("saving")
    const result = await saveAdminReview({
      checklistItemId: item.id,
      testerId,
      behaviorType: newBehavior,
      resolutionStatus: newStatus,
      notes: reviewNotes || null,
    })
    setReviewSaveStatus(result.error ? "error" : "saved")
    setTimeout(() => setReviewSaveStatus("idle"), 2000)
  }

  // Admin notes handler — debounced 500ms (text field)
  const handleReviewNotesChange = (value: string) => {
    setReviewNotes(value)
    if (reviewDebounceRef.current) clearTimeout(reviewDebounceRef.current)
    reviewDebounceRef.current = setTimeout(() => {
      setReviewSaveStatus("saving")
      saveAdminReview({
        checklistItemId: item.id,
        testerId,
        behaviorType,
        resolutionStatus,
        notes: value || null,
      }).then((result) => {
        setReviewSaveStatus(result.error ? "error" : "saved")
        setTimeout(() => setReviewSaveStatus("idle"), 2000)
      })
    }, 500)
  }

  const viewSample = item.view_sample?.trim() || null
  const hasImageSample = viewSample && isImageUrl(viewSample)
  const isDescriptSample = viewSample ? isDescriptUrl(viewSample) : false
  const driveFileId = viewSample ? extractGoogleDriveFileId(viewSample) : null
  const isGoogleDriveSample = !!driveFileId
  const hasNonImageSample = viewSample && !isImageUrl(viewSample)
  // Plain link only for URLs that aren't image, Descript, or Google Drive
  const hasPlainLinkSample = hasNonImageSample && !isDescriptSample && !isGoogleDriveSample

  const commentPrompt = status === "Fail"
    ? "Please describe the issue you encountered"
    : status === "Blocked"
      ? "Please describe what needs to be reviewed in this step"
      : "Add a comment..."

  return (
    <Card className={`${getCardStyles(status)} rounded-xl shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="py-4">
        {/* === HEADER LINE === */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center">
              {item.step_number}
            </span>
            {item.crm_module && (
              <Badge variant="outline" className="text-xs">{item.crm_module}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {saveStatus === "saving" && (
              <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
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
        <div className="prose prose-sm prose-gray max-w-none mb-4 text-base leading-relaxed text-gray-800
          prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
          prose-strong:text-gray-900 prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{item.action}</ReactMarkdown>
        </div>

        {/* === TIP CALLOUT === */}
        {item.tip && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 leading-relaxed prose prose-sm max-w-none
              prose-p:my-0.5 prose-ul:my-0.5 prose-strong:text-amber-900
              prose-a:text-amber-700">
              <span className="font-semibold">Tip: </span>
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{item.tip}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* === VISUAL REFERENCE (image preview) === */}
        {hasImageSample && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Review this before testing
              </p>
            </div>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewSample!}
                alt={`Reference for Step ${item.step_number}`}
                className="max-h-[280px] rounded-md border border-emerald-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer object-contain w-full"
                loading="lazy"
              />
              <span className="text-xs text-emerald-700 mt-1.5 inline-block hover:underline font-medium">
                Click to view full size
              </span>
            </a>
          </div>
        )}

        {/* === DESCRIPT EMBED === */}
        {isDescriptSample && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Review this before testing
              </p>
            </div>
            <div className="rounded-md overflow-hidden border border-emerald-200 shadow-sm">
              <iframe
                src={viewSample!}
                className="w-full"
                style={{ height: "320px", border: "none" }}
                allowFullScreen
                title={`Guide for Step ${item.step_number}`}
              />
            </div>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 mt-1.5 inline-block hover:underline font-medium"
            >
              Open in new tab
            </a>
          </div>
        )}

        {/* === GOOGLE DRIVE EMBED === */}
        {isGoogleDriveSample && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Review this before testing
              </p>
            </div>
            <div className="rounded-md overflow-hidden border border-emerald-200 shadow-sm">
              <iframe
                src={`https://drive.google.com/file/d/${driveFileId}/preview`}
                className="w-full"
                style={{ height: "320px", border: "none" }}
                allow="autoplay"
                allowFullScreen
                title={`Guide for Step ${item.step_number}`}
              />
            </div>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 mt-1.5 inline-block hover:underline font-medium"
            >
              Open in new tab
            </a>
          </div>
        )}

        {/* === PLAIN LINK (fallback for other non-image URLs) === */}
        {hasPlainLinkSample && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Review this before testing
              </p>
            </div>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 rounded-md text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Guide/Sample</span>
            </a>
          </div>
        )}

        {/* === TALKPUSH LOGIN LINK === */}
        {talkpushLoginLink && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-medium text-emerald-900 mb-1">Talkpush Login Link:</p>
            <a
              href={talkpushLoginLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-700 hover:underline break-all"
            >
              {talkpushLoginLink}
            </a>
          </div>
        )}

        {/* === STATUS BUTTONS === */}
        <div className="flex gap-2 mb-4">
          {STATUS_OPTIONS.map(({ value, label }) => {
            const isActive = status === value
            const styles = STATUS_STYLES[value]
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleStatusChange(value)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  min-h-[44px] flex-1
                  ${isActive ? styles.active : styles.inactive}
                `}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* === COMMENT SECTION === */}
        {!showComment && !status && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-gray-400 hover:text-emerald-700 transition-colors"
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
        {!showComment && status && status !== "Fail" && status !== "Blocked" && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-gray-400 hover:text-emerald-700 transition-colors"
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

        {/* === ADMIN REVIEW PANEL === */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-violet-100 bg-violet-50/40 rounded-lg px-3 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                Admin Review
              </span>
              {reviewSaveStatus === "saving" && (
                <span className="text-xs text-gray-400 animate-pulse ml-auto">Saving...</span>
              )}
              {reviewSaveStatus === "saved" && (
                <span className="text-xs text-violet-600 ml-auto">Saved ✓</span>
              )}
              {reviewSaveStatus === "error" && (
                <span className="text-xs text-red-500 ml-auto">Error saving</span>
              )}
            </div>

            {/* Behavior Type */}
            <div>
              <p className="text-xs text-violet-600 font-medium mb-1.5">Behavior Type</p>
              <div className="flex flex-wrap gap-1.5">
                {(["Expected Behavior", "Bug/Glitch", "Configuration Issue", "For Retesting"] as const).map((opt) => {
                  const isActive = behaviorType === opt
                  const activeStyle =
                    opt === "Expected Behavior"
                      ? "bg-green-600 text-white border-green-600"
                      : opt === "Bug/Glitch"
                      ? "bg-red-600 text-white border-red-600"
                      : opt === "For Retesting"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-orange-500 text-white border-orange-500"
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        handleReviewChange(opt === behaviorType ? null : opt, resolutionStatus)
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
                        isActive ? activeStyle : "border-violet-200 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Resolution Status */}
            <div>
              <p className="text-xs text-violet-600 font-medium mb-1.5">Resolution Status</p>
              <div className="flex gap-1.5">
                {(["Not Yet Started", "In Progress", "Done"] as const).map((opt) => {
                  const isActive = resolutionStatus === opt
                  const activeStyle =
                    opt === "Done"
                      ? "bg-green-600 text-white border-green-600"
                      : opt === "In Progress"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-gray-500 text-white border-gray-500"
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleReviewChange(behaviorType, opt)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
                        isActive ? activeStyle : "border-violet-200 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Findings / Comments */}
            <div>
              <p className="text-xs text-violet-600 font-medium mb-1.5">Findings / Comments</p>
              <textarea
                value={reviewNotes}
                onChange={(e) => handleReviewNotesChange(e.target.value)}
                placeholder="Add findings, reproduction steps, or notes..."
                rows={3}
                className="w-full text-sm rounded-lg border border-violet-200 bg-white px-3 py-2
                  placeholder:text-gray-400 text-gray-800 resize-none
                  focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200
                  transition-colors"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
