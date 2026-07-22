import { NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/oauth/origin"
import { buildProtectedResourceMetadata } from "@/lib/oauth/metadata"

// Handles the resource-suffixed discovery form, e.g.
// /.well-known/oauth-protected-resource/api/mcp (RFC 9728) — this app only
// has one protected resource, so every suffix resolves to the same metadata.
export async function GET(req: Request) {
  return NextResponse.json(buildProtectedResourceMetadata(getRequestOrigin(req)))
}
