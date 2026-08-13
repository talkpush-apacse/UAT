const SAMPLE_PROXY_PREFIX = "/api/public-sample"
const ATTACHMENTS_PUBLIC_PATH_MARKER = "/storage/v1/object/public/attachments/"
const ATTACHMENTS_SIGNED_PATH_MARKER = "/storage/v1/object/sign/attachments/"

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/^\/+/, "")
}

function decodePathSegments(pathname: string): string {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/")
}

export function buildSampleProxyPath(storagePath: string): string {
  const normalizedPath = normalizeStoragePath(storagePath)
  const encodedPath = normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${SAMPLE_PROXY_PREFIX}/${encodedPath}`
}

export function buildAbsoluteSampleProxyUrl(origin: string, storagePath: string): string {
  return new URL(buildSampleProxyPath(storagePath), origin).toString()
}

export function extractSampleStoragePath(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("samples/")) {
    return trimmed
  }

  if (trimmed.startsWith(`${SAMPLE_PROXY_PREFIX}/`)) {
    return decodePathSegments(trimmed.slice(SAMPLE_PROXY_PREFIX.length))
  }

  try {
    const parsed = new URL(trimmed)

    if (parsed.pathname.startsWith(`${SAMPLE_PROXY_PREFIX}/`)) {
      return decodePathSegments(parsed.pathname.slice(SAMPLE_PROXY_PREFIX.length))
    }

    const publicPathIndex = parsed.pathname.indexOf(ATTACHMENTS_PUBLIC_PATH_MARKER)
    if (publicPathIndex >= 0) {
      return decodeURIComponent(
        parsed.pathname.slice(publicPathIndex + ATTACHMENTS_PUBLIC_PATH_MARKER.length)
      )
    }

    const signedPathIndex = parsed.pathname.indexOf(ATTACHMENTS_SIGNED_PATH_MARKER)
    if (signedPathIndex >= 0) {
      return decodeURIComponent(
        parsed.pathname.slice(signedPathIndex + ATTACHMENTS_SIGNED_PATH_MARKER.length)
      )
    }
  } catch {
    return null
  }

  return null
}

export function resolveViewSampleUrl(rawUrl: string): string {
  const storagePath = extractSampleStoragePath(rawUrl)

  if (!storagePath?.startsWith("samples/")) {
    return rawUrl
  }

  return buildSampleProxyPath(storagePath)
}
