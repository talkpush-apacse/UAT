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
  return expected === token
}
