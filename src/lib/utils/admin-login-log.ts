import { createAdminClient } from '@/lib/supabase/admin'

export type AdminLoginMethod = 'password' | 'google'

// Logs one row per successful admin login. Called right after each login
// path's own success check — never blocks or breaks a login if the insert
// fails, since knowing "who logged in" must never be a reason someone can't.
export async function logAdminLoginEvent(
  method: AdminLoginMethod,
  email: string | null,
  requestHeaders: Headers
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('admin_login_events').insert({
      method,
      email,
      ip_address: requestHeaders.get('x-forwarded-for'),
      user_agent: requestHeaders.get('user-agent'),
    })
    if (error) console.error('Failed to log admin login event:', error.message)
  } catch (err) {
    console.error('Failed to log admin login event:', err)
  }
}
