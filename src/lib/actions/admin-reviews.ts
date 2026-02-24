'use server'

import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/* ------------------------------------------------------------------ */
/*  Save a single admin review (with history tracking)                 */
/* ------------------------------------------------------------------ */

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

  // 1. Fetch the current row (if exists) to compare for history tracking
  const { data: existing } = await supabase
    .from('admin_reviews')
    .select('behavior_type, resolution_status, notes')
    .eq('checklist_item_id', data.checklistItemId)
    .eq('tester_id', data.testerId)
    .maybeSingle()

  // 2. Upsert the review
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
    console.error('saveAdminReview failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    })
    return { error: error.message }
  }

  // 3. Track changes in history (fire-and-forget — don't block the response)
  const historyRows: {
    checklist_item_id: string
    tester_id: string
    field_changed: string
    old_value: string | null
    new_value: string | null
  }[] = []

  const oldBehavior = existing?.behavior_type ?? null
  const oldResolution = existing?.resolution_status ?? null
  const oldNotes = existing?.notes ?? null

  if (oldBehavior !== data.behaviorType) {
    historyRows.push({
      checklist_item_id: data.checklistItemId,
      tester_id: data.testerId,
      field_changed: 'behavior_type',
      old_value: oldBehavior,
      new_value: data.behaviorType,
    })
  }

  if (oldResolution !== data.resolutionStatus) {
    historyRows.push({
      checklist_item_id: data.checklistItemId,
      tester_id: data.testerId,
      field_changed: 'resolution_status',
      old_value: oldResolution,
      new_value: data.resolutionStatus,
    })
  }

  if (oldNotes !== data.notes) {
    historyRows.push({
      checklist_item_id: data.checklistItemId,
      tester_id: data.testerId,
      field_changed: 'notes',
      old_value: oldNotes,
      new_value: data.notes,
    })
  }

  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from('admin_review_history')
      .insert(historyRows)

    if (historyError) {
      // Non-critical — log but don't fail the save
      console.error('History insert failed:', historyError.message)
    }
  }

  revalidatePath(`/admin/projects/${data.projectSlug}/analytics`)
  revalidatePath(`/admin/projects/${data.projectSlug}/review`)
  return {}
}

/* ------------------------------------------------------------------ */
/*  Bulk mark multiple steps as resolved                               */
/* ------------------------------------------------------------------ */

export async function bulkMarkResolved(
  items: { checklistItemId: string; testerId: string }[],
  projectSlug: string
): Promise<{ updated: number; error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { updated: 0, error: 'Unauthorized' }

  if (items.length === 0) return { updated: 0 }

  const supabase = createAdminClient()
  const now = new Date().toISOString()
  let updatedCount = 0

  // Process each item — fetch old state, upsert, record history
  for (const item of items) {
    // Fetch current row to track history
    const { data: existing } = await supabase
      .from('admin_reviews')
      .select('resolution_status')
      .eq('checklist_item_id', item.checklistItemId)
      .eq('tester_id', item.testerId)
      .maybeSingle()

    const oldResolution = existing?.resolution_status ?? null

    // Skip if already resolved
    if (oldResolution === 'Done') continue

    // Upsert with resolution_status = 'Done'
    const { error } = await supabase
      .from('admin_reviews')
      .upsert(
        {
          checklist_item_id: item.checklistItemId,
          tester_id: item.testerId,
          resolution_status: 'Done',
          updated_at: now,
        },
        { onConflict: 'checklist_item_id,tester_id' }
      )

    if (error) {
      console.error('bulkMarkResolved upsert failed:', error.message)
      continue
    }

    updatedCount++

    // Record history
    await supabase.from('admin_review_history').insert({
      checklist_item_id: item.checklistItemId,
      tester_id: item.testerId,
      field_changed: 'resolution_status',
      old_value: oldResolution,
      new_value: 'Done',
    })
  }

  revalidatePath(`/admin/projects/${projectSlug}/analytics`)
  revalidatePath(`/admin/projects/${projectSlug}/review`)
  return { updated: updatedCount }
}
