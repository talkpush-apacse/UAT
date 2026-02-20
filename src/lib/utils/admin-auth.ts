import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { SESSION_DURATION_MS } from './session-constants'

const COOKIE_NAME = 'admin_session'

async function sign(payload: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET!
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Buffer.from(signature).toString('hex')
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function verifyAdminPassword(password: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? '')
  const provided = Buffer.from(password)
  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}

export async function createAdminSession(): Promise<void> {
  const timestamp = Date.now().toString()
  const signature = await sign(timestamp)
  const cookieValue = `${timestamp}.${signature}`

  cookies().set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })
}

export async function verifyAdminSession(): Promise<boolean> {
  const cookie = cookies().get(COOKIE_NAME)
  if (!cookie?.value) return false

  const [timestamp, signature] = cookie.value.split('.')
  if (!timestamp || !signature) return false

  const isValid = await verify(timestamp, signature)
  if (!isValid) return false

  const elapsed = Date.now() - parseInt(timestamp, 10)
  if (elapsed > SESSION_DURATION_MS) return false

  return true
}

export function destroyAdminSession(): void {
  cookies().delete(COOKIE_NAME)
}
