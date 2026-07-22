import { NextResponse } from "next/server"
import { consumeAuthorizationCode, issueTokenPair, rotateRefreshToken, getClient } from "@/lib/oauth/store"
import { verifyPkceS256 } from "@/lib/oauth/crypto"

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" }

async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}))
    return Object.fromEntries(
      Object.entries(json as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    )
  }
  const text = await req.text()
  return Object.fromEntries(new URLSearchParams(text))
}

function oauthError(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: NO_STORE_HEADERS }
  )
}

export async function POST(req: Request) {
  const body = await parseBody(req)
  const grantType = body.grant_type

  if (grantType === "authorization_code") {
    const {
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    } = body

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return oauthError("invalid_request", "Missing required parameters")
    }

    const client = await getClient(clientId)
    if (!client) return oauthError("invalid_client", undefined, 401)

    const consumed = await consumeAuthorizationCode(code)
    if (!consumed) {
      return oauthError("invalid_grant", "Code is invalid, expired, or already used")
    }

    if (consumed.client_id !== clientId || consumed.redirect_uri !== redirectUri) {
      return oauthError("invalid_grant", "client_id or redirect_uri mismatch")
    }

    if (!verifyPkceS256(codeVerifier, consumed.code_challenge)) {
      return oauthError("invalid_grant", "PKCE verification failed")
    }

    const tokens = await issueTokenPair({
      clientId,
      resource: consumed.resource,
      scope: consumed.scope,
    })

    return NextResponse.json(
      {
        access_token: tokens.accessToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
        scope: consumed.scope ?? undefined,
      },
      { headers: NO_STORE_HEADERS }
    )
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.refresh_token
    if (!refreshToken) return oauthError("invalid_request", "Missing refresh_token")

    const tokens = await rotateRefreshToken(refreshToken)
    if (!tokens) {
      return oauthError("invalid_grant", "Refresh token is invalid, expired, or revoked")
    }

    return NextResponse.json(
      {
        access_token: tokens.accessToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
      },
      { headers: NO_STORE_HEADERS }
    )
  }

  return oauthError("unsupported_grant_type", `grant_type '${grantType}' is not supported`)
}
