// Derives the origin from the incoming request rather than
// NEXT_PUBLIC_APP_URL, since this app is reachable at more than one
// production domain alias — the OAuth issuer/resource identifiers must
// match whichever host the client actually connected to.
export function getRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = forwardedHost || req.headers.get("host") || new URL(req.url).host
  const proto = req.headers.get("x-forwarded-proto") || "https"
  return `${proto}://${host}`
}
