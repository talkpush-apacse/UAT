import { NextResponse } from "next/server"
import { z } from "zod"
import { registerClient } from "@/lib/oauth/store"

// RFC 7591 Dynamic Client Registration. Only public clients (PKCE, no
// client secret) are supported — this server issues no client_secret and
// callers should treat token_endpoint_auth_method as "none" regardless of
// what they request.
//
// This endpoint is intentionally unauthenticated per the MCP/DCR spec (a
// client must be able to self-register before a human is ever involved).
// That means redirect_uri validation is the ONLY thing standing between an
// anonymous caller and registering a client that points at a domain they
// control — which, combined with an approval click, hands over a full
// service-role access token. So the host allowlist below is a hard security
// boundary, not a config nicety: only known real MCP client callback hosts
// may be registered.
const ALLOWED_REDIRECT_HOSTS = ["claude.ai"]

const registerSchema = z.object({
  client_name: z.string().max(200).optional(),
  redirect_uris: z.array(z.string().url().max(2000)).min(1).max(10),
})

function isAllowedRedirectUri(uri: string): boolean {
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

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Body must be JSON" },
      { status: 400 }
    )
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: parsed.error.message },
      { status: 400 }
    )
  }

  if (!parsed.data.redirect_uris.every(isAllowedRedirectUri)) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris must be HTTPS (or http://localhost)",
      },
      { status: 400 }
    )
  }

  const client = await registerClient(
    parsed.data.client_name ?? null,
    parsed.data.redirect_uris
  )

  return NextResponse.json(
    {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201 }
  )
}
