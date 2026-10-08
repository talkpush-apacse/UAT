"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import MDEditor from "./lazy-md-editor"
import ActionBody from "@/components/tester/action-body"
import { splitIntoSteps } from "@/lib/utils/action-text"

/* ------------------------------------------------------------------ */
/*  Helper: insert text at a textarea's cursor / selection             */
/* ------------------------------------------------------------------ */

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
  currentValue: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = currentValue.slice(start, end) || placeholder
  const newValue =
    currentValue.slice(0, start) +
    before + selected + after +
    currentValue.slice(end)

  onChange(newValue)

  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    const newCursor = start + before.length + selected.length + after.length
    textarea.setSelectionRange(newCursor, newCursor)
  })
}

/* ------------------------------------------------------------------ */
/*  RichActionEditor                                                    */
/* ------------------------------------------------------------------ */

interface Props {
  value: string
  onChange: (val: string) => void
  height?: number
}

export default function RichActionEditor({ value, onChange, height = 120 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [undoSplit, setUndoSplit] = useState<{ before: string; after: string } | null>(null)
  const [linkText, setLinkText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const linkTextRef = useRef<HTMLInputElement>(null)

  /* ── Close pickers on outside click ── */
  useEffect(() => {
    if (!showLinkDialog) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowLinkDialog(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showLinkDialog])

  /* ── Focus link text input when dialog opens ── */
  useEffect(() => {
    if (showLinkDialog) {
      setTimeout(() => linkTextRef.current?.focus(), 50)
    }
  }, [showLinkDialog])

  /* ── Get the MDEditor textarea ── */
  const getTextarea = useCallback((): HTMLTextAreaElement | null => {
    return wrapperRef.current?.querySelector("textarea") ?? null
  }, [])

  /* ── Open link dialog: pre-fill display text from selection ── */
  const handleOpenLinkDialog = () => {
    const ta = getTextarea()
    const selected = ta ? value.slice(ta.selectionStart, ta.selectionEnd) : ""
    setLinkText(selected)
    setLinkUrl("")
    setShowLinkDialog(true)
  }

  /* ── Insert link ── */
  const handleInsertLink = () => {
    const ta = getTextarea()
    if (!ta) return
    const display = linkText.trim() || "link text"
    const url = linkUrl.trim() || "https://"
    insertAtCursor(ta, `[${display}](`, ")", url, value, onChange)
    // Override: replace selection with formatted link directly
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newValue =
      value.slice(0, start) +
      `[${display}](${url})` +
      value.slice(end)
    onChange(newValue)
    setShowLinkDialog(false)
    setLinkText("")
    setLinkUrl("")
  }

  /* ── Insert a warning callout (a "> " paragraph, shown to testers as a red box) ── */
  const handleInsertWarning = () => {
    const ta = getTextarea()
    if (!ta) return
    const selected = value.slice(ta.selectionStart, ta.selectionEnd).trim().replace(/\s*\n+\s*/g, " ")
    const before = value.slice(0, ta.selectionStart).replace(/\s+$/, "")
    const after = value.slice(ta.selectionEnd).replace(/^\s+/, "")
    onChange([before, `> ${selected || "Warning text"}`, after].filter(Boolean).join("\n\n"))
    setShowLinkDialog(false)
  }

  /* ── Turn one long paragraph into a numbered list (undoable) ── */
  const splitResult = splitIntoSteps(value)
  const canUndoSplit = undoSplit !== null && value === undoSplit.after
  const handleSplit = () => {
    if (!splitResult) return
    setUndoSplit({ before: value, after: splitResult })
    onChange(splitResult)
  }
  const handleUndoSplit = () => {
    if (undoSplit) onChange(undoSplit.before)
    setUndoSplit(null)
  }

  /* ── Keyboard: Enter in link dialog ── */
  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleInsertLink() }
    if (e.key === "Escape") { setShowLinkDialog(false) }
  }

  return (
    <div ref={wrapperRef} className="relative" data-color-mode="light">
      {/* ── Custom toolbar row ── */}
      <div className="flex items-center gap-1.5 mb-1">
        {/* Link button */}
        <button
          type="button"
          onClick={handleOpenLinkDialog}
          title="Insert hyperlink"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-brand-sage-lightest hover:border-brand-sage-lighter hover:text-brand-sage-darker transition-colors"
        >
          <LinkIcon />
          Link
        </button>

        {/* Warning button */}
        <button
          type="button"
          onClick={handleInsertWarning}
          title='Add a warning box. Testers see it as a red callout.'
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-brand-sage-lightest hover:border-brand-sage-lighter hover:text-brand-sage-darker transition-colors"
        >
          <WarningIcon />
          Warning
        </button>

        {/* Split into numbered steps */}
        {canUndoSplit ? (
          <button
            type="button"
            onClick={handleUndoSplit}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Undo split
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSplit}
            disabled={!splitResult}
            title={
              splitResult
                ? "Turn each sentence into a numbered step (you can undo)"
                : "Works on a plain paragraph of 3 or more sentences"
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-brand-sage-lightest hover:border-brand-sage-lighter hover:text-brand-sage-darker transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600"
          >
            <ListIcon />
            Split into steps
          </button>
        )}

        {/* Link dialog dropdown */}
        {showLinkDialog && (
          <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
            <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">
              Insert Hyperlink
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Display Text</label>
                <input
                  ref={linkTextRef}
                  type="text"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  onKeyDown={handleLinkKeyDown}
                  placeholder="e.g. Click here"
                  className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-brand-lavender focus:ring-1 focus:ring-brand-lavender-lighter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={handleLinkKeyDown}
                  placeholder="https://example.com"
                  className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-brand-lavender focus:ring-1 focus:ring-brand-lavender-lighter"
                />
              </div>
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="flex-1 py-1.5 text-xs font-medium rounded bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkDialog(false)}
                  className="flex-1 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MDEditor ── */}
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
      />

      <p className="mt-1 text-xs text-gray-500">
        Write <span className="font-mono">Expected: …</span> for the expected-result box. Start a paragraph with{" "}
        <span className="font-mono">&gt;</span> for a warning box.
      </p>
      {value.length > 600 && !/^\s*\d+[.)]\s/m.test(value) && (
        <p className="mt-1 text-xs text-amber-700">
          Long step ({value.length} characters). Testers give it a single Pass/Fail, so consider a numbered list or
          splitting it into two steps.
        </p>
      )}

      {value.trim() && (
        <details open className="mt-2 rounded-md border border-dashed border-gray-300 bg-gray-50">
          <summary className="cursor-pointer select-none px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            How testers see this
          </summary>
          <div className="border-t border-dashed border-gray-300 bg-white p-3">
            <ActionBody>{value}</ActionBody>
          </div>
        </details>
      )}
    </div>
  )
}

/* ── Inline SVG icons (no extra deps) ── */

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  )
}
