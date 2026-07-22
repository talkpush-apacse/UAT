import { createAdminClient } from "@/lib/supabase/admin"
import { generateOpaqueToken, sha256Hex } from "./crypto"

const AUTH_CODE_TTL_MS = 60 * 1000
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface OAuthClient {
  client_id: string
  client_name: string | null
  redirect_uris: string[]
  token_endpoint_auth_method: string
}

export async function registerClient(
  clientName: string | null,
  redirectUris: string[]
): Promise<OAuthClient> {
  const supabase = createAdminClient()
  const clientId = generateOpaqueToken("mcp")

  const { data, error } = await supabase
    .from("oauth_clients")
    .insert({
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
    })
    .select("client_id, client_name, redirect_uris, token_endpoint_auth_method")
    .single()

  if (error || !data) {
    throw new Error(`Failed to register OAuth client: ${error?.message}`)
  }

  return data
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("oauth_clients")
    .select("client_id, client_name, redirect_uris, token_endpoint_auth_method")
    .eq("client_id", clientId)
    .maybeSingle()

  return data
}

export async function createAuthorizationCode(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  resource?: string | null
  scope?: string | null
}): Promise<string> {
  const supabase = createAdminClient()
  const code = generateOpaqueToken("code")
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString()

  const { error } = await supabase.from("oauth_authorization_codes").insert({
    code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    resource: params.resource ?? null,
    scope: params.scope ?? null,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to create authorization code: ${error.message}`)
  }

  return code
}

export interface ConsumedAuthorizationCode {
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  resource: string | null
  scope: string | null
}

// Atomically marks the code as used and returns its data, or null if the
// code doesn't exist, was already used, or has expired. Codes are one-time
// use per OAuth 2.1 §4.1.2 to prevent replay.
export async function consumeAuthorizationCode(
  code: string
): Promise<ConsumedAuthorizationCode | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("oauth_authorization_codes")
    .update({ used: true })
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select(
      "client_id, redirect_uri, code_challenge, code_challenge_method, resource, scope"
    )
    .maybeSingle()

  if (error || !data) return null
  return data
}

export interface IssuedTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function issueTokenPair(params: {
  clientId: string
  resource?: string | null
  scope?: string | null
}): Promise<IssuedTokenPair> {
  const supabase = createAdminClient()
  const accessToken = generateOpaqueToken("mcpat")
  const refreshToken = generateOpaqueToken("mcprt")
  const now = Date.now()

  const { error } = await supabase.from("oauth_tokens").insert({
    client_id: params.clientId,
    access_token_hash: sha256Hex(accessToken),
    refresh_token_hash: sha256Hex(refreshToken),
    resource: params.resource ?? null,
    scope: params.scope ?? null,
    access_token_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    refresh_token_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
  })

  if (error) {
    throw new Error(`Failed to issue token pair: ${error.message}`)
  }

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 }
}

export interface ValidAccessToken {
  clientId: string
  resource: string | null
  scope: string | null
}

// `expectedResource` enforces token audience binding (MCP spec, RFC 8707):
// a token issued for one resource must not be usable against another. Pass
// null only for legacy tokens issued before the resource parameter was
// enforced; new tokens always carry a resource.
export async function validateAccessToken(
  token: string,
  expectedResource: string
): Promise<ValidAccessToken | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("oauth_tokens")
    .select("client_id, resource, scope, revoked, access_token_expires_at")
    .eq("access_token_hash", sha256Hex(token))
    .maybeSingle()

  if (!data || data.revoked) return null
  if (new Date(data.access_token_expires_at).getTime() < Date.now()) return null
  if (data.resource && data.resource !== expectedResource) return null

  return { clientId: data.client_id, resource: data.resource, scope: data.scope }
}

// Rotates the refresh token: the old grant row is revoked and a fresh
// access/refresh pair is issued, per OAuth 2.1 §4.3.1 refresh token rotation
// for public clients.
export async function rotateRefreshToken(refreshToken: string): Promise<IssuedTokenPair | null> {
  const supabase = createAdminClient()
  const refreshTokenHash = sha256Hex(refreshToken)

  const { data: existing } = await supabase
    .from("oauth_tokens")
    .select("id, client_id, resource, scope, revoked, refresh_token_expires_at")
    .eq("refresh_token_hash", refreshTokenHash)
    .maybeSingle()

  if (!existing || existing.revoked) return null
  if (
    !existing.refresh_token_expires_at ||
    new Date(existing.refresh_token_expires_at).getTime() < Date.now()
  ) {
    return null
  }

  const { error: revokeError } = await supabase
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("id", existing.id)

  if (revokeError) {
    throw new Error(`Failed to revoke rotated token: ${revokeError.message}`)
  }

  return issueTokenPair({
    clientId: existing.client_id,
    resource: existing.resource,
    scope: existing.scope,
  })
}
