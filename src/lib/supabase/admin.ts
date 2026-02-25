import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        // Prevent Next.js Data Cache from serving stale Supabase query results
        fetch: (url, options = {}) => {
          return fetch(url, { ...options, cache: 'no-store' })
        },
      },
    }
  )
}
