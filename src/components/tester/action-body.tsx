"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import RichText from "./rich-text"
import { capitalizeFirst, splitExpected, splitWarnings } from "@/lib/utils/action-text"

const TESTER_PROSE =
  "prose prose-sm prose-gray max-w-none text-[17px] font-normal leading-[1.7] text-primary " +
  "prose-p:my-2.5 prose-ul:my-2.5 prose-ol:my-2.5 prose-ol:pl-6 prose-ul:pl-6 prose-li:my-1.5 " +
  "prose-li:marker:font-bold prose-li:marker:text-primary prose-strong:font-bold prose-strong:text-primary"

const EXPECTED_PROSE =
  "prose prose-sm prose-gray max-w-none text-base font-normal leading-relaxed text-primary " +
  "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:font-bold prose-strong:text-primary"

const COMPACT_PROSE =
  "prose prose-sm prose-gray max-w-none text-sm leading-relaxed text-gray-800 " +
  "prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-strong:text-gray-900"

const WARNING_PROSE =
  "prose prose-sm max-w-none text-[17px] font-semibold leading-snug text-red-950 " +
  "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:font-extrabold prose-strong:text-red-950"

const WARNING_PROSE_COMPACT =
  "prose prose-sm max-w-none text-sm font-semibold leading-snug text-red-950 " +
  "prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-strong:font-extrabold prose-strong:text-red-950"

/**
 * A step's instructions as testers read them: warnings (">") first, in a
 * banner above everything else wherever the author typed them, then the steps
 * with the main link as a button, then the "Expected:" part as its own
 * labelled block. Used by the tester pages and by the admin previews so both
 * show exactly the same thing.
 */
export default function ActionBody({
  children,
  compact = false,
  highlightFirstLink = true,
}: {
  children: string
  /** Smaller type for admin previews. */
  compact?: boolean
  highlightFirstLink?: boolean
}) {
  const { main: withoutWarnings, warnings } = splitWarnings(children)
  const { main, expected } = splitExpected(withoutWarnings)
  const linkClassName = "text-primary font-bold hover:text-primary/70"

  return (
    <div>
      {warnings.length > 0 && (
        <div
          role="note"
          aria-label="Read this before you start"
          className={`overflow-hidden rounded-lg border-2 border-red-700 bg-red-50 ${compact ? "mb-2" : "mb-4"}`}
        >
          <p
            className={`flex items-center gap-2 bg-red-700 font-bold uppercase tracking-wide text-white ${
              compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
            }`}
          >
            <AlertTriangle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
            Read this before you start
          </p>
          <div
            className={`divide-y divide-red-200 ${compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"}`}
          >
            {warnings.map((warning, i) => (
              <div key={i} className={i > 0 ? (compact ? "pt-1.5" : "pt-2.5") : undefined}>
                <RichText
                  linkClassName="text-red-900 font-bold underline hover:text-red-700"
                  className={compact ? WARNING_PROSE_COMPACT : WARNING_PROSE}
                >
                  {warning}
                </RichText>
              </div>
            ))}
          </div>
        </div>
      )}

      {main && (
        <RichText
          linkClassName={linkClassName}
          className={compact ? COMPACT_PROSE : TESTER_PROSE}
          highlightFirstLink={highlightFirstLink}
        >
          {main}
        </RichText>
      )}

      {expected && (
        <div
          className={`rounded-lg border-2 border-primary bg-brand-sage-lightest ${
            compact ? "mt-2 px-2.5 py-2" : "mt-4 px-3.5 py-3"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 font-bold text-primary ${
              compact ? "mb-0.5 text-xs" : "mb-1 text-sm"
            }`}
          >
            <CheckCircle2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
            Expected result
          </p>
          <RichText
            linkClassName={linkClassName}
            className={compact ? COMPACT_PROSE : EXPECTED_PROSE}
          >
            {capitalizeFirst(expected)}
          </RichText>
        </div>
      )}
    </div>
  )
}
