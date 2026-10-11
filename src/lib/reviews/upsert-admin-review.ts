import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Values the review panel offers. Shared so the admin screen and the MCP
// triage tool accept exactly the same set.
export const FINDING_TYPES = [
  'Expected Behavior',
  'Bug/Glitch',
  'Configuration Issue',
  'User Error',
  'Blocked',
] as const

export const RESOLUTION_STATUSES = [
  'Not Yet Started',
  'In Progress',
  'For Retesting',
  'Done',
] as const

export interface AdminReviewInput {
  checklistItemId: string
  testerId: string
  findingType: string | null
  resolutionStatus: string
  notes: string | null
}

/**
 * Saves one admin review (finding type, resolution status, notes) for a
 * tester's step and records what changed in admin_review_history.
 *
 * No auth check and no cache revalidation here: callers do both, because the
 * admin screen authenticates with a browser session and the MCP tools with an
 * API key / OAuth token.
 */
export async function upsertAdminReview(
  supabase: SupabaseClient<Database>,
  data: AdminReviewInput
): Promise<{ error?: string }> {
  // 1. Fetch the current row (if exists) to compare for history tracking
  const { data: existing } = await supabase
    .from('admin_reviews')
    .select('finding_type, resolution_status, notes')
    .eq('checklist_item_id', data.checklistItemId)
    .eq('tester_id', data.testerId)
    .maybeSingle()

  // 2. Upsert the review
  const payload = {
    checklist_item_id: data.checklistItemId,
    tester_id: data.testerId,
    finding_type: data.findingType,
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

  // 3. Track changes in history
  const historyRows: {
    checklist_item_id: string
    tester_id: string
    field_changed: string
    old_value: string | null
    new_value: string | null
  }[] = []

  const oldBehavior = existing?.finding_type ?? null
  const oldResolution = existing?.resolution_status ?? null
  const oldNotes = existing?.notes ?? null

  if (oldBehavior !== data.findingType) {
    historyRows.push({
      checklist_item_id: data.checklistItemId,
      tester_id: data.testerId,
      field_changed: 'finding_type',
      old_value: oldBehavior,
      new_value: data.findingType,
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

  return {}
}
