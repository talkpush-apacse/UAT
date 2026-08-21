"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { areaForPath, trackButtonClick, trackPageView } from "@/lib/mixpanel"

const MAX_LABEL_LENGTH = 80

function labelForElement(el: Element): string {
  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel?.trim()) return ariaLabel.trim().slice(0, MAX_LABEL_LENGTH)

  const text = el.textContent?.replace(/\s+/g, " ").trim()
  if (text) return text.slice(0, MAX_LABEL_LENGTH)

  return "Unlabeled button"
}

// Delegated on `document` (not per-button) so every button — including ones
// added to the app after this was written — is tracked with zero extra code.
function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Element | null
  const button = target?.closest('button, [role="button"]')
  if (!button) return

  const pathname = window.location.pathname
  trackButtonClick(labelForElement(button), pathname, areaForPath(pathname))
}

export function MixpanelTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackPageView(pathname, areaForPath(pathname))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick, true)
    return () => document.removeEventListener("click", handleDocumentClick, true)
  }, [])

  return null
}
