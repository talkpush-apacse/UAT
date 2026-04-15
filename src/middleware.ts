import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SESSION_DURATION_MS } from '@/lib/utils/session-constants'
import { isAllowedAdminEmail } from '@/lib/utils/admin-access'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/test') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth')
  ) {
    return NextResponse.next()
  }

  // Skip login page
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    if (hasValidAdminSessionCookie(request)) {
      return NextResponse.next()
    }

    // Note: Full HMAC verification happens in server actions/components (defense-in-depth)
    const { isAllowed, response } = await hasValidSupabaseAdminSession(request)
    if (isAllowed) return response

    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

function hasValidAdminSessionCookie(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('admin_session')

  if (!sessionCookie?.value) {
    return false
  }

  // Basic format check (timestamp.signature)
  const parts = sessionCookie.value.split('.')
  if (parts.length !== 2) {
    return false
  }

  // Check expiry
  const timestamp = parseInt(parts[0], 10)
  if (isNaN(timestamp) || Date.now() - timestamp > SESSION_DURATION_MS) {
    return false
  }

  return true
}

async function hasValidSupabaseAdminSession(
  request: NextRequest
): Promise<{ isAllowed: boolean; response: NextResponse }> {
  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Supabase middleware auth verification failed:', error.message)
      return { isAllowed: false, response }
    }

    return {
      isAllowed: isAllowedAdminEmail(user?.email),
      response,
    }
  } catch (error) {
    console.error('Supabase middleware auth verification failed:', error)
    return { isAllowed: false, response }
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
