"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Bookmark, Lightbulb } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

/**
 * Visual section divider rendered for `item_type === 'phase_header'`.
 * Has no status buttons, no comment field, and no file upload — phase headers
 * are not testable. The DB triggers reject any response or admin_review against
 * a phase_header row, so this UI is the only place users encounter these.
 */
export default function PhaseHeaderCard({
  label,
  action,
  tip,
}: {
  label: string | null
  action: string
  tip: string | null
}) {
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-l-brand-lavender bg-brand-lavender-lightest">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-lavender-lighter flex items-center justify-center text-brand-lavender-darker">
            <Bookmark className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-lavender-darker bg-white border border-brand-lavender-lighter rounded-full px-2 py-0.5">
                Phase Header
              </span>
              {label && (
                <span className="text-[11px] font-mono uppercase tracking-wide text-brand-lavender-darker">
                  {label}
                </span>
              )}
            </div>

            <div className="prose prose-sm prose-gray max-w-none text-base leading-relaxed text-gray-800
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-strong:text-gray-900 prose-a:text-brand-lavender-darker prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{action}</ReactMarkdown>
            </div>

            {tip && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 leading-relaxed prose prose-sm max-w-none
                  prose-p:my-0.5 prose-ul:my-0.5 prose-strong:text-amber-900
                  prose-a:text-amber-700">
                  <span className="font-semibold">Tip: </span>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{tip}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
