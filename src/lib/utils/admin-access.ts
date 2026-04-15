const ADMIN_EMAIL_DOMAIN = '@talkpush.com'

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN) ?? false
}
