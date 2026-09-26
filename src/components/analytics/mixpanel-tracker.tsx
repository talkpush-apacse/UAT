"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { areaForPath, trackButtonClick, trackPageView } from "@/lib/mixpanel"

const MAX_LABEL_LENGTH = 80

// Order: data-track (a stable analytics name, e.g. "Remove attachment" instead
// of an aria-label that includes a file name) → known third-party widgets →
// aria-label → visible text → title. Title comes last so buttons that already
// have text keep the exact label existing reports use; it only names
// icon-only controls that would otherwise be "Unlabeled button".
function labelForElement(el: Element): string {
  const trackLabel = el.getAttribute("data-track")
  if (trackLabel?.trim()) return trackLabel.trim().slice(0, MAX_LABEL_LENGTH)

  // react-phone-input-2's flag picker is an unlabeled div[role=button] whose
  // title is the selected country — label it generically instead.
  if (el.classList.contains("selected-flag") && el.closest(".react-tel-input")) {
    return "Phone country picker"
  }

  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel?.trim()) return ariaLabel.trim().slice(0, MAX_LABEL_LENGTH)

  const text = el.textContent?.replace(/\s+/g, " ").trim()
  if (text) return text.slice(0, MAX_LABEL_LENGTH)

  const title = el.getAttribute("title")
  if (title?.trim()) return title.trim().slice(0, MAX_LABEL_LENGTH)

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
