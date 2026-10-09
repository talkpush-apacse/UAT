import { z } from 'zod'
import { isAllowedAdminEmail } from '@/lib/utils/admin-access'

export const MAX_NOTIFICATION_RECIPIENTS = 10

export const notificationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'That email address is too long')
  .email('Enter a valid email address')
  .refine(isAllowedAdminEmail, 'Only @talkpush.com addresses can be added')

// Lower-cased, de-duplicated list of recipient emails for one checklist.
export const notificationRecipientsSchema = z
  .array(notificationEmailSchema)
  .max(
    MAX_NOTIFICATION_RECIPIENTS,
    `You can notify up to ${MAX_NOTIFICATION_RECIPIENTS} people`
  )
  .transform((emails) => Array.from(new Set(emails)))
