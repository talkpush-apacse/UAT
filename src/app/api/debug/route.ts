import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasAdminPassword = !!process.env.ADMIN_PASSWORD
  const hasSessionSecret = !!process.env.ADMIN_SESSION_SECRET

  // Test admin client (service role)
  let adminProjectCount = null
  let adminTesterCount = null
  let adminError = null
  try {
    const admin = createAdminClient()
    const { data: projects, error: pErr } = await admin.from("projects").select("id")
    if (pErr) {
      adminError = pErr.message
    } else {
      adminProjectCount = projects?.length ?? 0
    }
    const { data: testers, error: tErr } = await admin.from("testers").select("id")
    if (tErr) {
      adminError = (adminError || "") + " | testers: " + tErr.message
    } else {
      adminTesterCount = testers?.length ?? 0
    }
  } catch (e) {
    adminError = String(e)
  }

  // Test anon client
  let anonProjectCount = null
  let anonTesterCount = null
  let anonError = null
  try {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: projects, error: pErr } = await anon.from("projects").select("id")
    if (pErr) {
      anonError = pErr.message
    } else {
      anonProjectCount = projects?.length ?? 0
    }
    const { data: testers, error: tErr } = await anon.from("testers").select("id")
    if (tErr) {
      anonError = (anonError || "") + " | testers: " + tErr.message
    } else {
      anonTesterCount = testers?.length ?? 0
    }
  } catch (e) {
    anonError = String(e)
  }

  return NextResponse.json({
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: hasUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey,
      ADMIN_PASSWORD: hasAdminPassword,
      ADMIN_SESSION_SECRET: hasSessionSecret,
    },
    adminClient: {
      projects: adminProjectCount,
      testers: adminTesterCount,
      error: adminError,
    },
    anonClient: {
      projects: anonProjectCount,
      testers: anonTesterCount,
      error: anonError,
    },
  })
}
