import { NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/oauth/origin"
import { buildAuthorizationServerMetadata } from "@/lib/oauth/metadata"

// Handles the path-suffixed issuer discovery form (RFC 8414 §3.1) — this
// app only has one authorization server, so every suffix resolves the same.
export async function GET(req: Request) {
  return NextResponse.json(buildAuthorizationServerMetadata(getRequestOrigin(req)))
}
