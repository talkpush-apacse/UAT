import { randomBytes, createHash, timingSafeEqual } from "crypto"

export function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("hex")}`
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Only S256 is supported — the "plain" PKCE method is rejected as a matter
// of policy (OAuth 2.1 recommends S256-only for public clients).
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = base64UrlEncode(createHash("sha256").update(codeVerifier).digest())
  const a = Buffer.from(computed)
  const b = Buffer.from(codeChallenge)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
