const MAX_RETURN_PATH_LENGTH = 500
const PARSE_BASE = 'http://return-path.invalid'

/**
 * Validates a "send me back here after sign-in" path. Returns a clean
 * path + query that stays inside /admin, or null for anything else.
 *
 * This guards against open redirects: the value comes from a URL anyone can
 * craft, so only same-site /admin pages (never the login page itself, other
 * hosts, or protocol-relative "//host" paths) are accepted.
 * Pure string handling so it also runs in the Edge middleware.
 */
export function safeAdminReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_RETURN_PATH_LENGTH) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null

  let url: URL
  try {
    url = new URL(raw, PARSE_BASE)
  } catch {
    return null
  }
  if (url.origin !== PARSE_BASE) return null

  const { pathname } = url
  const insideAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const isLogin = pathname === '/admin/login' || pathname.startsWith('/admin/login/')
  if (!insideAdmin || isLogin) return null

  return `${pathname}${url.search}`
}
