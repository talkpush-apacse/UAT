import type { ReactNode } from "react"
import { ClientLogosHeader } from "./client-logos-header"

/**
 * Sticky title bar shared by the classic and wizard checklist views.
 * Kept to one title row plus the progress bar: it stays on screen while the
 * tester reads, so every extra line here is taken away from the instructions.
 */
export default function TesterHeader({
  clientLogoUrl,
  companyName,
  subtitle,
  right,
  ariaLive,
  children,
}: {
  clientLogoUrl?: string | null
  companyName: string
  subtitle: string
  right: ReactNode
  ariaLive?: "polite"
  children?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 border-b-2 border-primary bg-white pb-2.5 pt-2.5">
      <div aria-live={ariaLive} className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ClientLogosHeader clientLogoUrl={clientLogoUrl} className="hidden flex-shrink-0 sm:flex" logoClassName="h-4" />
          <div className="min-w-0 sm:flex sm:items-baseline sm:gap-2.5">
            <h1 className="truncate text-lg font-bold leading-tight text-primary sm:text-xl">{companyName}</h1>
            <p className="truncate text-sm font-medium text-gray-700">{subtitle}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-lg font-bold text-primary">{right}</div>
      </div>
      {children}
    </div>
  )
}
