import { EMAIL_SENDER } from "@/lib/email/sender"

// Brevo accepts a send request and only rejects an unregistered sender
// afterwards, so a bad sender used to look like "Sent!" to the admin while the
// tester got nothing. This asks Brevo up front whether the sender is allowed.
//
// Server-side only. Fails OPEN: if the check itself can't be completed (Brevo
// slow or down, key without permission) we say "unknown" and let the send go
// ahead, so a problem with the check never blocks real emails.

export type SenderCheck =
  | { status: "ok" }
  | { status: "rejected" }
  | { status: "unknown" }

const BREVO_API = "https://api.brevo.com/v3"
const CHECK_TIMEOUT_MS = 3000
const CACHE_TTL_MS = 5 * 60 * 1000

// Only a passing result is cached, so fixing the sender in Brevo takes effect
// on the very next attempt.
let cachedOk: { sender: string; expiresAt: number } | null = null

export function resetSenderCheckCache(): void {
  cachedOk = null
}

type Deps = { fetchFn?: typeof fetch; now?: () => number }

async function getJson(
  fetchFn: typeof fetch,
  path: string,
  apiKey: string
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    const res = await fetchFn(`${BREVO_API}${path}`, {
      headers: { "api-key": apiKey, accept: "application/json" },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Is `senderEmail` allowed to send through this Brevo account? It is if it is
 * a registered, active sender, or if its domain is an authenticated domain.
 */
export async function checkSenderRegistered(
  apiKey: string,
  senderEmail: string,
  deps: Deps = {}
): Promise<SenderCheck> {
  const fetchFn = deps.fetchFn ?? fetch
  const now = (deps.now ?? Date.now)()
  const sender = senderEmail.trim().toLowerCase()

  if (cachedOk && cachedOk.sender === sender && cachedOk.expiresAt > now) {
    return { status: "ok" }
  }

  const [sendersJson, domainsJson] = await Promise.all([
    getJson(fetchFn, "/senders", apiKey),
    getJson(fetchFn, "/senders/domains", apiKey),
  ])

  const senders = Array.isArray(sendersJson?.senders)
    ? (sendersJson.senders as { email?: string; active?: boolean }[])
    : null
  const domains = Array.isArray(domainsJson?.domains)
    ? (domainsJson.domains as { domain_name?: string; authenticated?: boolean }[])
    : null

  const listedAndActive =
    senders?.some((s) => s.email?.trim().toLowerCase() === sender && s.active === true) ?? false
  const domain = sender.split("@")[1] ?? ""
  const onAuthenticatedDomain =
    domains?.some((d) => d.domain_name?.trim().toLowerCase() === domain && d.authenticated === true) ??
    false

  if (listedAndActive || onAuthenticatedDomain) {
    cachedOk = { sender, expiresAt: now + CACHE_TTL_MS }
    return { status: "ok" }
  }

  // Only a firm "no" when Brevo answered both questions and neither says yes.
  if (senders && domains) return { status: "rejected" }
  return { status: "unknown" }
}

export function senderBlockedMessage(senderEmail: string): string {
  return `Email can't be sent: the sender ${senderEmail} isn't verified in Brevo. Ask an admin to check Brevo (Senders, Domains & Dedicated IPs).`
}

/**
 * The one call sites use. Returns a message to show the user when the sender
 * is definitely not allowed, or null when it's fine to send (including when
 * the check was inconclusive).
 */
export async function getSenderBlockMessage(
  apiKey: string,
  senderEmail: string = EMAIL_SENDER.email,
  deps: Deps = {}
): Promise<string | null> {
  const result = await checkSenderRegistered(apiKey, senderEmail, deps)
  if (result.status === "rejected") return senderBlockedMessage(senderEmail)
  if (result.status === "unknown") {
    console.error("Sender check inconclusive; sending anyway")
  }
  return null
}
