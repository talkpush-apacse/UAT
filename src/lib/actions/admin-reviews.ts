'use server'

import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveAdminReview(data: {
  checklistItemId: string
  testerId: string
  behaviorType: string | null
  resolutionStatus: string
  notes: string | null
  projectSlug: string
}): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()

  const payload = {
    checklist_item_id: data.checklistItemId,
    tester_id: data.testerId,
    behavior_type: data.behaviorType,
    resolution_status: data.resolutionStatus,
    notes: data.notes,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('admin_reviews')
    .upsert(payload, { onConflict: 'checklist_item_id,tester_id' })

  if (error) {
    // Log full error context for debugging — hidden from user
    console.error('saveAdminReview failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    })
    return { error: error.message }
  }

  // Revalidate the admin analytics page so the score reflects the new finding
  // immediately when the admin next loads the page.
  revalidatePath(`/admin/projects/${data.projectSlug}/analytics`)
  revalidatePath(`/admin/projects/${data.projectSlug}/review`)
  return {}
}
