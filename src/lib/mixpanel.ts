import mixpanel from "mixpanel-browser"

let initialized = false

// No-ops outside production (or without a token) so local dev sessions never
// send events into the real project — there's no tool to delete stray
// Mixpanel events afterward the way there is for a Supabase table.
function isEnabled(): boolean {
  return process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
}

function ensureInitialized(): boolean {
  if (!isEnabled()) return false
  if (!initialized) {
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN as string, {
      track_pageview: false, // we track page views ourselves on route change
      persistence: "localStorage",
    })
    initialized = true
  }
  return true
}

export type MixpanelArea = "admin" | "tester" | "other"

export function areaForPath(pathname: string): MixpanelArea {
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/test")) return "tester"
  return "other"
}

export function trackPageView(pathname: string, area: MixpanelArea): void {
  if (!ensureInitialized()) return
  mixpanel.track("Page View", { path: pathname, area })
}

export function trackButtonClick(label: string, pathname: string, area: MixpanelArea): void {
  if (!ensureInitialized()) return
  mixpanel.track("Button Clicked", { label, path: pathname, area })
}

// Admin pages only — testers are deliberately never identified by email,
// to avoid creating a new place where candidate PII is linked to behavior data.
export function identifyAdmin(email: string): void {
  if (!ensureInitialized()) return
  mixpanel.identify(email)
  mixpanel.people.set({ $email: email })
}
