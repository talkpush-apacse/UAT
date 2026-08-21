"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { identifyAdmin } from "@/lib/mixpanel"

// Google-login admins only — password-login admins have no Supabase session
// at all (see Phase 1/3 notes), so getUser() resolves to no email for them
// and this simply does nothing. Reads the session client-side, on purpose:
// doing this server-side in admin/layout.tsx would force every admin page
// into dynamic rendering just to read one cookie for an analytics call.
export function MixpanelIdentifyAdmin() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) identifyAdmin(data.user.email)
    })
  }, [])

  return null
}
