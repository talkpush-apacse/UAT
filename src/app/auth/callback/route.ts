import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAllowedAdminEmail } from '@/lib/utils/admin-access'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Supabase OAuth callback failed:', error.message)
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (!isAllowedAdminEmail(data.user?.email)) {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('Supabase unauthorized sign-out failed:', signOutError.message)
    }

    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
  }

  return NextResponse.redirect(new URL('/admin/projects', request.url))
}
