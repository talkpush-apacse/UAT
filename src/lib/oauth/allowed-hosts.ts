// The actual security boundary for this OAuth server is "does this redirect
// point at a trusted host", not "does it match some specific path we saw
// once at registration time" — different claude.ai surfaces (personal,
// Team/org-scoped, desktop app) use different callback paths under the same
// host. This is shared by registration (what's allowed to be registered at
// all) and by /oauth/authorize (what's allowed to receive a code), so both
// stay in sync.
export const ALLOWED_REDIRECT_HOSTS = ["claude.ai"]

export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    if (parsed.protocol === "https:" && ALLOWED_REDIRECT_HOSTS.includes(parsed.hostname)) {
      return true
    }
    if (parsed.protocol === "http:" && parsed.hostname === "localhost") return true
    return false
  } catch {
    return false
  }
}
