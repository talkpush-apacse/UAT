import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip login page
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('admin_session')

    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Basic format check (timestamp.signature)
    const parts = sessionCookie.value.split('.')
    if (parts.length !== 2) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Check expiry (24 hours)
    const timestamp = parseInt(parts[0], 10)
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Note: Full HMAC verification happens in server actions/components (defense-in-depth)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
