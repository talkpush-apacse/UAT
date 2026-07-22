import { NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/oauth/origin"
import { buildAuthorizationServerMetadata } from "@/lib/oauth/metadata"

export async function GET(req: Request) {
  return NextResponse.json(buildAuthorizationServerMetadata(getRequestOrigin(req)))
}
