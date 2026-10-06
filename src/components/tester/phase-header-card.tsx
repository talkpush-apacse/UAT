"use client"

import { Card, CardContent } from "@/components/ui/card"
import RichText from "./rich-text"

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
    <Card className="rounded-xl border-2 border-primary bg-brand-lavender-lightest shadow-none">
      <CardContent className="p-4 sm:p-5">
        {label && <p className="mb-1.5 text-sm font-bold text-primary">{label}</p>}

        <RichText
          linkClassName="text-primary font-bold hover:text-primary/70"
          className="prose prose-sm prose-gray max-w-none text-[17px] font-medium leading-relaxed text-primary
            prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-strong:font-bold prose-strong:text-primary"
        >
          {action}
        </RichText>

        {tip && (
          <div className="mt-3 rounded-lg border-2 border-primary bg-brand-amber-lightest px-3 py-2.5 text-[15px] font-medium leading-relaxed text-primary">
            <span className="font-bold">Tip: </span>
            <RichText
              linkClassName="text-primary font-bold hover:text-primary/70"
              className="prose prose-sm max-w-none text-[15px] font-medium text-primary prose-p:my-0.5 prose-ul:my-0.5 prose-strong:font-bold prose-strong:text-primary"
            >
              {tip}
            </RichText>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
