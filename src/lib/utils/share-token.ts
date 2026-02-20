import { timingSafeEqual } from 'crypto'

export async function generateShareToken(slug: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET!
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(slug))
  return Buffer.from(sig).toString("hex")
}

export async function verifyShareToken(slug: string, token: string): Promise<boolean> {
  const expected = await generateShareToken(slug)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
