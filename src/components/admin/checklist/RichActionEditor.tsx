"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import MDEditor from "@uiw/react-md-editor"

/* ------------------------------------------------------------------ */
/*  Color presets                                                       */
/* ------------------------------------------------------------------ */

const COLOR_PRESETS = [
  { name: "Red",    hex: "#dc2626" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Amber",  hex: "#d97706" },
  { name: "Green",  hex: "#16a34a" },
  { name: "Blue",   hex: "#2563eb" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Teal",   hex: "#0d9488" },
  { name: "Gray",   hex: "#6b7280" },
]

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
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [linkText, setLinkText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const linkTextRef = useRef<HTMLInputElement>(null)

  /* ── Close pickers on outside click ── */
  useEffect(() => {
    if (!showColorPicker && !showLinkDialog) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
        setShowLinkDialog(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showColorPicker, showLinkDialog])

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
    setShowColorPicker(false)
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

  /* ── Insert color span ── */
  const handleInsertColor = (hex: string) => {
    const ta = getTextarea()
    if (!ta) return
    insertAtCursor(
      ta,
      `<span style="color:${hex}">`,
      "</span>",
      "colored text",
      value,
      onChange
    )
    setShowColorPicker(false)
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

        {/* Color button */}
        <button
          type="button"
          onClick={() => { setShowLinkDialog(false); setShowColorPicker(p => !p) }}
          title="Add text color"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-brand-sage-lightest hover:border-brand-sage-lighter hover:text-brand-sage-darker transition-colors"
        >
          <ColorIcon />
          Color
        </button>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide px-0.5">
              Text Color
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {COLOR_PRESETS.map(({ name, hex }) => (
                <button
                  key={hex}
                  type="button"
                  title={name}
                  onClick={() => handleInsertColor(hex)}
                  className="w-7 h-7 rounded-full border-2 border-white shadow ring-1 ring-gray-200 hover:ring-2 hover:ring-offset-1 transition-all"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
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

function ColorIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 20 8 12 12 20" />
      <polyline points="20 20 16 12 12 20" />
      <line x1="6" y1="16" x2="18" y2="16" />
      <line x1="2" y1="22" x2="22" y2="22" stroke="#dc2626" strokeWidth="3" />
    </svg>
  )
}
