import type { ReactNode } from "react"
import { ClientLogosHeader } from "./client-logos-header"

/** Sticky title bar shared by the classic and wizard checklist views. */
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
    <div className="sticky top-0 z-10 border-b-2 border-primary bg-white pb-4 pt-4">
      <div aria-live={ariaLive} className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <ClientLogosHeader clientLogoUrl={clientLogoUrl} />
          <h1 className="truncate text-xl font-bold text-primary sm:text-2xl">{companyName}</h1>
          <p className="text-sm font-medium text-gray-700">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 pt-1 text-lg font-bold text-primary">{right}</div>
      </div>
      {children}
    </div>
  )
}
