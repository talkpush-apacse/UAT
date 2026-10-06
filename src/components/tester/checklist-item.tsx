"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createAnonClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink } from "lucide-react"
import FileUpload from "./file-upload"
import RichText, { UrlLink } from "./rich-text"
import { resolveViewSampleUrl } from "@/lib/utils/sample-url"
import { errorCategoryFor, trackEvent, type StepContext } from "@/lib/mixpanel"

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
  { value: "Blocked", label: "Blocked" },
  { value: "Up For Review", label: "Up For Review" },
] as const

// Only the chosen answer takes its colour; the rest stay neutral so a row of
// five buttons doesn't read as five competing signals.
const STATUS_ACTIVE: Record<string, string> = {
  Pass: "bg-green-700 text-white",
  Fail: "bg-red-700 text-white",
  "N/A": "bg-gray-700 text-white",
  Blocked: "bg-orange-700 text-white",
  "Up For Review": "bg-amber-700 text-white",
}

const COMMENT_PROMPT_COLOR: Record<string, string> = {
  Fail: "text-red-700",
  Blocked: "text-orange-700",
  "Up For Review": "text-amber-800",
}

/**
 * Returns true only when the string is a non-empty http/https URL with no
 * placeholder brackets (e.g. "[Add screenshot: ...]") and no embedded newlines.
 */
function isValidGuideUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") return false
  const trimmed = url.trim()
  // Reject placeholder text starting with "["
  if (trimmed.startsWith("[")) return false
  // Reject strings containing newline characters
  if (/[\r\n]/.test(trimmed)) return false
  if (trimmed.startsWith("/")) return true
  // Must be a valid http or https URL
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
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

/** Labelled wrapper for the "review this first" sample (image, video or link). */
function ReferenceBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-bold text-primary">Review before testing</p>
      {children}
    </div>
  )
}

const OPEN_IN_NEW_TAB_LINK =
  "mt-1.5 inline-block text-sm font-bold text-primary underline underline-offset-4 hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"

export default function ChecklistItem({
  item,
  testerId,
  response,
  attachments,
  onResponseUpdate,
  onAttachmentsChange,
  talkpushLoginLink,
  previewMode = false,
  trackingContext,
  onSaveFailedChange,
}: {
  item: ChecklistItemData
  testerId: string
  response: ResponseData | null
  attachments: AttachmentData[]
  onResponseUpdate: (itemId: string, response: ResponseData) => void
  onAttachmentsChange?: (responseId: string, attachments: AttachmentData[]) => void
  talkpushLoginLink?: string | null
  previewMode?: boolean
  /** Analytics-only: where this step sits in the checklist (see docs/analytics-events.md) */
  trackingContext: Omit<StepContext, "step_id" | "step_number">
  // Lets the list show a page-level "didn't save" banner for this step.
  onSaveFailedChange?: (itemId: string, failed: boolean) => void
}) {
  const [status, setStatus] = useState<string | null>(response?.status || null)
  const [comment, setComment] = useState(response?.comment || "")
  const [responseId, setResponseId] = useState(response?.id || null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [showComment, setShowComment] = useState(
    !!response?.comment || status === "Fail" || status === "Blocked" || status === "Up For Review"
  )

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef(createAnonClient())

  const isSaveFailed = saveStatus === "error"
  useEffect(() => {
    onSaveFailedChange?.(item.id, isSaveFailed)
  }, [isSaveFailed, item.id, onSaveFailedChange])

  // Tracks the latest status/comment on every render (no effect needed) so the
  // unmount-flush below can read fresh values without re-subscribing on every
  // keystroke. Also guards against out-of-order concurrent saves: only the
  // most recently issued save is allowed to update state — an earlier click's
  // response resolving after a later one can no longer clobber it.
  const latestArgsRef = useRef({ status, comment })
  latestArgsRef.current = { status, comment }
  const latestRequestIdRef = useRef(0)

  // Kept in a ref so `save` (and the unmount flush that depends on it) doesn't
  // get a new identity whenever the parent re-renders with a fresh object.
  const trackingRef = useRef(trackingContext)
  trackingRef.current = trackingContext

  const save = useCallback(
    async (newStatus: string | null, newComment: string, saveKind: "status" | "comment") => {
      if (previewMode) return

      const reportFailure = (err: unknown) =>
        trackEvent("Response Save Failed", {
          project_slug: trackingRef.current.project_slug,
          step_number: item.step_number,
          view_mode: trackingRef.current.view_mode,
          save_kind: saveKind,
          error_category: errorCategoryFor(err),
        })

      const requestId = ++latestRequestIdRef.current
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

        // A newer save has since been issued — ignore this now-stale result
        // so it can't overwrite state a more recent click already set.
        if (requestId !== latestRequestIdRef.current) return

        if (error) {
          setSaveStatus("error")
          reportFailure(error)
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
      } catch (err) {
        if (requestId === latestRequestIdRef.current) {
          setSaveStatus("error")
          reportFailure(err)
        }
      }
    },
    [testerId, item.id, item.step_number, responseId, onResponseUpdate, previewMode]
  )

  const handleStatusChange = (newStatus: string) => {
    if (previewMode) return

    const finalStatus = newStatus === status ? null : newStatus
    setStatus(finalStatus)

    trackEvent("Step Status Set", {
      ...trackingContext,
      step_id: item.id,
      step_number: item.step_number,
      status: finalStatus,
      previous_status: status,
    })

    if (finalStatus === "Fail" || finalStatus === "Blocked" || finalStatus === "Up For Review") {
      setShowComment(true)
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    save(finalStatus, comment, "status")
  }

  const handleCommentChange = (value: string) => {
    if (previewMode) return

    setComment(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save(status, value, "comment")
    }, 500)
  }

  // Flush (not cancel) a pending debounced comment save on unmount — otherwise
  // a comment typed just before navigation is silently dropped.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        save(latestArgsRef.current.status, latestArgsRef.current.comment, "comment")
      }
    }
  }, [save])

  // Validate the guide URL before deciding which embed variant to show — #1
  const rawSample = item.view_sample?.trim() || null
  const normalizedSample = rawSample ? resolveViewSampleUrl(rawSample) : null
  const viewSample = isValidGuideUrl(normalizedSample) ? normalizedSample : null

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
      ? "Which step is blocking you?"
      : status === "Up For Review"
        ? "Please describe what needs to be reviewed in this step"
        : "Add a comment..."

  return (
    // Step ID anchor for deep-linking
    <Card
      id={`step-${item.step_number}`}
      className="scroll-mt-44 rounded-xl border-2 border-primary bg-white shadow-none"
    >
      <CardContent className="p-4 sm:p-5">
        {/* Meta line: step number, who acts, where, and save state */}
        <div className="mb-3 flex items-center gap-2.5">
          <span className="select-none whitespace-nowrap rounded-lg bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
            Step {item.step_number}
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium text-gray-700">
            <span className="font-bold text-primary">{item.actor}</span>
            {item.crm_module && <> · {item.crm_module}</>}
          </p>
          <div className="flex-shrink-0 text-sm">
            {previewMode && <span className="font-medium text-gray-600">Preview only</span>}
            {saveStatus === "saving" && (
              <span className="animate-pulse font-medium text-gray-700">Saving…</span>
            )}
            {saveStatus === "saved" && <span className="font-bold text-green-700">Saved</span>}
            {saveStatus === "error" && (
              <button
                type="button"
                onClick={() => save(status, comment, "status")}
                className="rounded font-bold text-red-700 underline underline-offset-2 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                Not saved — Retry
              </button>
            )}
          </div>
        </div>

        {/* Instructions — URLs auto-linked, long ones shortened */}
        <RichText
          linkClassName="text-primary font-bold hover:text-primary/70"
          className="prose prose-sm prose-gray mb-4 max-w-none text-[17px] font-medium leading-relaxed text-primary
            prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-strong:font-bold prose-strong:text-primary"
        >
          {item.action}
        </RichText>

        {item.tip && (
          <div className="mb-4 rounded-lg border-2 border-primary bg-brand-amber-lightest px-3 py-2.5 text-[15px] font-medium leading-relaxed text-primary">
            <span className="font-bold">Tip: </span>
            <RichText
              linkClassName="text-primary font-bold hover:text-primary/70"
              className="prose prose-sm max-w-none text-[15px] font-medium text-primary prose-p:my-0.5 prose-ul:my-0.5 prose-strong:font-bold prose-strong:text-primary"
            >
              {item.tip}
            </RichText>
          </div>
        )}

        {/* Reference sample — image, Descript / Drive embed, or plain link */}
        {hasImageSample && (
          <ReferenceBlock>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full size"
              className="block cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewSample!}
                alt={`Reference for Step ${item.step_number}`}
                className="max-h-[280px] w-full rounded-lg border-2 border-primary bg-white object-contain"
                loading="lazy"
              />
            </a>
          </ReferenceBlock>
        )}

        {isDescriptSample && (
          <ReferenceBlock>
            <div className="overflow-hidden rounded-lg border-2 border-primary">
              <iframe
                src={viewSample!}
                className="w-full"
                style={{ height: "320px", border: "none" }}
                allowFullScreen
                title={`Guide for Step ${item.step_number}`}
              />
            </div>
            <a href={viewSample!} target="_blank" rel="noopener noreferrer" className={OPEN_IN_NEW_TAB_LINK}>
              Open in new tab
            </a>
          </ReferenceBlock>
        )}

        {isGoogleDriveSample && (
          <ReferenceBlock>
            <div className="overflow-hidden rounded-lg border-2 border-primary">
              <iframe
                src={`https://drive.google.com/file/d/${driveFileId}/preview`}
                className="w-full"
                style={{ height: "320px", border: "none" }}
                allow="autoplay"
                allowFullScreen
                title={`Guide for Step ${item.step_number}`}
              />
            </div>
            <a href={viewSample!} target="_blank" rel="noopener noreferrer" className={OPEN_IN_NEW_TAB_LINK}>
              Open in new tab
            </a>
          </ReferenceBlock>
        )}

        {hasPlainLinkSample && (
          <ReferenceBlock>
            <a
              href={viewSample!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View guide or sample</span>
            </a>
          </ReferenceBlock>
        )}

        {talkpushLoginLink && isValidGuideUrl(talkpushLoginLink) && (
          <div className="mb-4 rounded-lg border-2 border-primary bg-brand-amber-lightest px-3 py-2.5">
            <p className="mb-0.5 text-sm font-bold text-primary">Talkpush login link</p>
            <p className="text-sm font-medium text-primary [overflow-wrap:anywhere]">
              <UrlLink url={talkpushLoginLink} linkClassName="font-bold text-primary hover:text-primary/70" />
            </p>
          </div>
        )}

        {/* Status buttons — only the chosen answer is filled */}
        {!previewMode && (
          <div className="mb-4 grid grid-cols-6 gap-2 sm:flex">
            {STATUS_OPTIONS.map(({ value, label }, index) => {
              const isActive = status === value
              // A selected-but-unsaved answer looks outlined (dashed), not filled,
              // so it doesn't read as done.
              const stateClass = isActive
                ? isSaveFailed
                  ? "border-dashed bg-white text-primary"
                  : STATUS_ACTIVE[value]
                : "bg-white text-primary hover:bg-secondary"
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusChange(value)}
                  aria-pressed={isActive}
                  className={`
                    min-h-[48px] rounded-lg border-2 border-primary px-3 py-2 text-[15px] font-bold transition-colors
                    sm:flex-1 ${index < 3 ? "col-span-2" : "col-span-3"}
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${stateClass}
                  `}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Comment */}
        {!previewMode && !showComment && (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="rounded text-sm font-bold text-primary underline underline-offset-4 hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            + Add comment
          </button>
        )}
        {!previewMode && (showComment || status === "Fail" || status === "Blocked" || status === "Up For Review") && (
          <div>
            {(status === "Fail" || status === "Blocked" || status === "Up For Review") && (
              <p className={`mb-1 text-sm font-bold ${COMMENT_PROMPT_COLOR[status]}`}>{commentPrompt}</p>
            )}
            <Textarea
              placeholder={commentPrompt}
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              rows={2}
              className="rounded-lg border-2 border-primary text-base font-medium md:text-base"
            />
          </div>
        )}

        {!previewMode && responseId && (
          <div className="mt-3">
            <FileUpload
              responseId={responseId}
              testerId={testerId}
              projectId={item.id}
              existingAttachments={attachments}
              onAttachmentsChange={(next) => onAttachmentsChange?.(responseId, next)}
              trackingContext={{
                project_slug: trackingContext.project_slug,
                step_number: item.step_number,
                view_mode: trackingContext.view_mode,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
