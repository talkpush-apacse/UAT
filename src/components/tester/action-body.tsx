"use client"

import { CheckCircle2 } from "lucide-react"
import RichText from "./rich-text"
import { splitExpected } from "@/lib/utils/action-text"

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

/**
 * A step's instructions as testers read them: the steps, the main link as a
 * button, warnings (">") as a callout, and the "Expected:" part as its own
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
  const { main, expected } = splitExpected(children)
  const linkClassName = "text-primary font-bold hover:text-primary/70"

  return (
    <div>
      <RichText
        linkClassName={linkClassName}
        className={compact ? COMPACT_PROSE : TESTER_PROSE}
        highlightFirstLink={highlightFirstLink}
      >
        {main}
      </RichText>

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
            {expected}
          </RichText>
        </div>
      )}
    </div>
  )
}
