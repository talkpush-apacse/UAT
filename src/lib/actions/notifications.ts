'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { notificationRecipientsSchema } from '@/lib/schemas/notification'

export interface UpdateRecipientsResult {
  error?: string
  emails?: string[]
}

// Replaces the list of staff emailed when a tester submits this checklist.
// Only adds and removes the differences, so a failure part-way never wipes
// the whole list.
export async function updateProjectNotificationRecipients(
  projectId: string,
  slug: string,
  emails: string[]
): Promise<UpdateRecipientsResult> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const parsed = notificationRecipientsSchema.safeParse(emails)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email list' }
  }
  const wanted = parsed.data

  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('project_notification_recipients')
    .select('id, email')
    .eq('project_id', projectId)

  if (fetchError) return { error: 'Could not save the list. Please try again.' }

  const current = existing ?? []
  const wantedSet = new Set(wanted)
  const currentSet = new Set(current.map((r) => r.email.toLowerCase()))

  const idsToRemove = current
    .filter((r) => !wantedSet.has(r.email.toLowerCase()))
    .map((r) => r.id)
  const toAdd = wanted.filter((email) => !currentSet.has(email))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('project_notification_recipients')
      .insert(toAdd.map((email) => ({ project_id: projectId, email })))
    if (error) return { error: 'Could not save the list. Please try again.' }
  }

  if (idsToRemove.length > 0) {
    const { error } = await supabase
      .from('project_notification_recipients')
      .delete()
      .in('id', idsToRemove)
    if (error) return { error: 'Could not save the list. Please try again.' }
  }

  revalidatePath(`/admin/projects/${slug}/edit`)
  return { emails: wanted }
}
