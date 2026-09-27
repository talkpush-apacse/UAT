import mixpanel from "mixpanel-browser"

let initialized = false

// No-ops outside production (or without a token) so local dev sessions never
// send events into the real project — there's no tool to delete stray
// Mixpanel events afterward the way there is for a Supabase table.
function isEnabled(): boolean {
  return process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
}

// Local dev only: print what *would* be sent, so new events can be checked in
// the browser console without touching the real project.
function logLocally(event: string, props: object): void {
  if (process.env.NODE_ENV !== "production" && typeof console !== "undefined") {
    console.debug("[mixpanel:dev]", event, props)
  }
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

// Share-analytics links carry their access token as the last path segment.
const SHARE_TOKEN_PATH = /^(\/share\/analytics\/[^/]+\/)[^/?#]+/

export function scrubPath(pathname: string): string {
  return pathname.replace(SHARE_TOKEN_PATH, "$1[token]")
}

// Origin + scrubbed path only. The query string is dropped because it holds
// ?tester=<id> on tester pages; anything unparsable is dropped entirely.
function scrubUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + scrubPath(u.pathname)
  } catch {
    return ""
  }
}

// mixpanel-browser attaches the raw page URL and referrers to every event;
// event properties win over its defaults, so overwrite them with scrubbed
// copies. Without this, share tokens and tester ids reach Mixpanel even when
// our own `path` property is clean.
function urlOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const overrides: Record<string, string> = { $current_url: scrubUrl(window.location.href) }
  if (document.referrer) overrides.$referrer = scrubUrl(document.referrer)
  if (initialized) {
    const initialReferrer = mixpanel.get_property("$initial_referrer")
    if (typeof initialReferrer === "string" && initialReferrer !== "$direct") {
      overrides.$initial_referrer = scrubUrl(initialReferrer)
    }
  }
  return overrides
}

// Every event goes through here so the URL scrubbing can't be skipped.
function send(event: string, props: Record<string, unknown>): void {
  const safe = typeof props.path === "string" ? { ...props, path: scrubPath(props.path) } : props
  if (!isEnabled()) {
    logLocally(event, { ...safe, ...urlOverrides() })
    return
  }
  ensureInitialized()
  mixpanel.track(event, { ...safe, ...urlOverrides() })
}

export function trackPageView(pathname: string, area: MixpanelArea): void {
  send("Page View", { path: pathname, area })
}

export function trackButtonClick(label: string, pathname: string, area: MixpanelArea): void {
  send("Button Clicked", { label, path: pathname, area })
}

// ---------------------------------------------------------------------------
// Outcome events. Property dictionary: docs/analytics-events.md.
//
// Privacy rules for everything below: ids, step numbers, counts and short
// enums only. Never tester name/email/phone, comment text, file names, or raw
// error messages — raw errors are reduced to an ErrorCategory first.
// ---------------------------------------------------------------------------

export type ViewMode = "classic" | "wizard"
export type ErrorCategory = "network" | "validation" | "storage" | "not_found" | "unknown"

export type StepContext = {
  project_slug: string
  step_id: string
  step_number: number
  step_position: number
  total_steps: number
  view_mode: ViewMode
}

type TrackedEvents = {
  "Step Status Set": StepContext & { status: string | null; previous_status: string | null }
  "Test Completed": {
    project_slug: string
    view_mode: ViewMode
    total_steps: number
    pass: number
    fail: number
    na: number
    blocked: number
    review: number
  }
  "Response Save Failed": {
    project_slug: string
    step_number: number
    view_mode: ViewMode
    save_kind: "status" | "comment"
    error_category: ErrorCategory
  }
  "Attachment Upload Failed": {
    project_slug: string
    step_number: number
    view_mode: ViewMode
    stage: "file_type" | "file_size" | "upload_url" | "storage" | "save_record" | "network"
    file_kind: "image" | "pdf" | "doc" | "other"
    file_count: number
  }
  "Mark Complete Failed": {
    project_slug: string
    view_mode: ViewMode
    error_category: ErrorCategory | "missing_evidence"
  }
  "Registration Failed": {
    project_slug: string
    reason: "form_check" | "server_check" | "already_registered" | "server_error"
    fields: string[]
  }
}

export function trackEvent<E extends keyof TrackedEvents>(event: E, props: TrackedEvents[E]): void {
  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  send(event, { ...props, path: pathname, area: areaForPath(pathname) })
}

// Reduces a Supabase/fetch error to a short category — the raw message can
// contain table names, ids or user input, so it never leaves the browser.
export function errorCategoryFor(error: unknown): ErrorCategory {
  if (error instanceof TypeError) return "network"
  const e = (error ?? {}) as { code?: unknown; message?: unknown }
  const code = typeof e.code === "string" ? e.code : ""
  const message = typeof e.message === "string" ? e.message : ""
  if (/failed to fetch|network|load failed/i.test(message)) return "network"
  if (code === "PGRST116") return "not_found"
  if (code.startsWith("22") || code.startsWith("23")) return "validation"
  return "unknown"
}

export function fileKindFor(mimeType: string): TrackedEvents["Attachment Upload Failed"]["file_kind"] {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.includes("word") || mimeType.includes("document")) return "doc"
  return "other"
}

// Admin pages only — testers are deliberately never identified, to avoid
// creating a new place where candidate PII is linked to behavior data.
// Identifies by the stable Supabase auth user id, not email — Mixpanel's
// own guidance is to never use email as the distinct_id (it can change;
// it's not a stable primary key). Email is still attached as a profile
// property so it's visible in Mixpanel's UI.
export function identifyAdmin(userId: string, email: string): void {
  if (!ensureInitialized()) return
  mixpanel.identify(userId)
  mixpanel.people.set({ $email: email })
}

// Call on logout. Without this, the next person to log in on the same
// browser (e.g. a shared office machine, or this app's shared password
// login) would get merged into the previous admin's identified session.
export function resetMixpanel(): void {
  if (!ensureInitialized()) return
  mixpanel.reset()
}
