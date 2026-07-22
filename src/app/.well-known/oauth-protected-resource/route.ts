import { NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/oauth/origin"
import { buildProtectedResourceMetadata } from "@/lib/oauth/metadata"

export async function GET(req: Request) {
  return NextResponse.json(buildProtectedResourceMetadata(getRequestOrigin(req)))
}
