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

  revalidatePath(`/admin/projects/${data.projectSlug}/review`)
  // Also revalidate the public share analytics page
  revalidatePath(`/share/analytics/${data.projectSlug}`, 'layout')
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

  // Build composite keys for the batch lookup
  const checklistItemIds = items.map((i) => i.checklistItemId)
  const testerIds = items.map((i) => i.testerId)

  // 1. Batch-fetch all existing reviews in one query instead of N individual fetches
  const { data: existingRows, error: fetchError } = await supabase
    .from('admin_reviews')
    .select('checklist_item_id, tester_id, resolution_status')
    .in('checklist_item_id', checklistItemIds)
    .in('tester_id', testerIds)

  if (fetchError) {
    console.error('bulkMarkResolved fetch failed:', fetchError.message)
    return { updated: 0, error: fetchError.message }
  }

  // Build a lookup map: "checklistItemId::testerId" → resolution_status
  const existingMap = new Map<string, string | null>()
  for (const row of existingRows ?? []) {
    existingMap.set(
      `${row.checklist_item_id}::${row.tester_id}`,
      row.resolution_status
    )
  }

  // 2. Filter out items that are already 'Done', build upsert + history payloads
  const upsertRows: {
    checklist_item_id: string
    tester_id: string
    resolution_status: string
    updated_at: string
  }[] = []

  const historyRows: {
    checklist_item_id: string
    tester_id: string
    field_changed: string
    old_value: string | null
    new_value: string | null
  }[] = []

  for (const item of items) {
    const key = `${item.checklistItemId}::${item.testerId}`
    const oldResolution = existingMap.get(key) ?? null

    // Skip if already resolved
    if (oldResolution === 'Done') continue

    upsertRows.push({
      checklist_item_id: item.checklistItemId,
      tester_id: item.testerId,
      resolution_status: 'Done',
      updated_at: now,
    })

    historyRows.push({
      checklist_item_id: item.checklistItemId,
      tester_id: item.testerId,
      field_changed: 'resolution_status',
      old_value: oldResolution,
      new_value: 'Done',
    })
  }

  if (upsertRows.length === 0) {
    return { updated: 0 }
  }

  // 3. Batch upsert all rows at once
  const { error: upsertError } = await supabase
    .from('admin_reviews')
    .upsert(upsertRows, { onConflict: 'checklist_item_id,tester_id' })

  if (upsertError) {
    console.error('bulkMarkResolved upsert failed:', upsertError.message)
    return { updated: 0, error: upsertError.message }
  }

  // 4. Batch insert all history rows at once (non-critical — log but don't fail)
  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from('admin_review_history')
      .insert(historyRows)

    if (historyError) {
      console.error('bulkMarkResolved history insert failed:', historyError.message)
    }
  }

  revalidatePath(`/admin/projects/${projectSlug}/review`)
  // Also revalidate the public share analytics page
  revalidatePath(`/share/analytics/${projectSlug}`, 'layout')
  return { updated: upsertRows.length }
}

/* ------------------------------------------------------------------ */
/*  Complete all reviews — categorize + resolve every item             */
/* ------------------------------------------------------------------ */

export async function completeAllReviews(
  items: { checklistItemId: string; testerId: string }[],
  projectSlug: string
): Promise<{ updated: number; categorized: number; error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { updated: 0, categorized: 0, error: 'Unauthorized' }

  if (items.length === 0) return { updated: 0, categorized: 0 }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Build arrays for the batch lookup
  const checklistItemIds = items.map((i) => i.checklistItemId)
  const testerIds = items.map((i) => i.testerId)

  // 1. Batch-fetch all existing reviews in one query instead of N individual fetches
  const { data: existingRows, error: fetchError } = await supabase
    .from('admin_reviews')
    .select('checklist_item_id, tester_id, behavior_type, resolution_status, notes')
    .in('checklist_item_id', checklistItemIds)
    .in('tester_id', testerIds)

  if (fetchError) {
    console.error('completeAllReviews fetch failed:', fetchError.message)
    return { updated: 0, categorized: 0, error: fetchError.message }
  }

  // Build a lookup map: "checklistItemId::testerId" → existing row data
  const existingMap = new Map<
    string,
    { behavior_type: string | null; resolution_status: string | null; notes: string | null }
  >()
  for (const row of existingRows ?? []) {
    existingMap.set(`${row.checklist_item_id}::${row.tester_id}`, {
      behavior_type: row.behavior_type,
      resolution_status: row.resolution_status,
      notes: row.notes,
    })
  }

  // 2. Build upsert + history payloads, skipping items already fully complete
  const upsertRows: {
    checklist_item_id: string
    tester_id: string
    behavior_type: string
    resolution_status: string
    notes: string | null
    updated_at: string
  }[] = []

  const historyRows: {
    checklist_item_id: string
    tester_id: string
    field_changed: string
    old_value: string | null
    new_value: string | null
  }[] = []

  let categorizedCount = 0

  for (const item of items) {
    const key = `${item.checklistItemId}::${item.testerId}`
    const existing = existingMap.get(key)

    const oldBehavior = existing?.behavior_type ?? null
    const oldResolution = existing?.resolution_status ?? null

    // Determine new values
    const newBehavior = oldBehavior ?? 'Expected Behavior'
    const newResolution = 'Done'

    // Skip if already fully complete
    if (oldBehavior !== null && oldResolution === 'Done') continue

    upsertRows.push({
      checklist_item_id: item.checklistItemId,
      tester_id: item.testerId,
      behavior_type: newBehavior,
      resolution_status: newResolution,
      notes: existing?.notes ?? null,
      updated_at: now,
    })

    if (oldBehavior === null) categorizedCount++

    // Track history for each changed field
    if (oldBehavior !== newBehavior) {
      historyRows.push({
        checklist_item_id: item.checklistItemId,
        tester_id: item.testerId,
        field_changed: 'behavior_type',
        old_value: oldBehavior,
        new_value: newBehavior,
      })
    }

    if (oldResolution !== newResolution) {
      historyRows.push({
        checklist_item_id: item.checklistItemId,
        tester_id: item.testerId,
        field_changed: 'resolution_status',
        old_value: oldResolution,
        new_value: newResolution,
      })
    }
  }

  if (upsertRows.length === 0) {
    return { updated: 0, categorized: 0 }
  }

  // 3. Batch upsert all rows at once
  const { error: upsertError } = await supabase
    .from('admin_reviews')
    .upsert(upsertRows, { onConflict: 'checklist_item_id,tester_id' })

  if (upsertError) {
    console.error('completeAllReviews upsert failed:', upsertError.message)
    return { updated: 0, categorized: 0, error: upsertError.message }
  }

  // 4. Batch insert all history rows at once (non-critical — log but don't fail)
  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from('admin_review_history')
      .insert(historyRows)

    if (historyError) {
      console.error('completeAllReviews history insert failed:', historyError.message)
    }
  }

  revalidatePath(`/admin/projects/${projectSlug}/review`)
  // Also revalidate the public share analytics page
  revalidatePath(`/share/analytics/${projectSlug}`, 'layout')
  return { updated: upsertRows.length, categorized: categorizedCount }
}
