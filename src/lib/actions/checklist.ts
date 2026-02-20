'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { parseChecklistFile } from '@/lib/utils/xlsx-parser'
import {
  updateChecklistItemSchema,
  addChecklistItemSchema,
  reorderChecklistSchema,
} from '@/lib/schemas/checklist'
import type { Database } from '@/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type ChecklistItemUpdate = Database['public']['Tables']['checklist_items']['Update']

export interface ChecklistActionState {
  error?: string
  errors?: string[]
  success?: boolean
  itemCount?: number
}

/* ------------------------------------------------------------------ */
/*  renumberSteps — keeps step_number = 1,2,3,...,N in sort_order      */
/* ------------------------------------------------------------------ */

async function renumberSteps(
  projectId: string,
  supabase: SupabaseClient<Database>
) {
  const { data: items } = await supabase
    .from('checklist_items')
    .select('id, step_number')
    .eq('project_id', projectId)
    .order('sort_order')

  if (!items || items.length === 0) return

  // Skip if already sequential
  const needsRenumber = items.some((item, idx) => item.step_number !== idx + 1)
  if (!needsRenumber) return

  // Pass 1: Set to negative values to avoid UNIQUE constraint collisions
  await Promise.all(
    items.map((item, idx) =>
      supabase
        .from('checklist_items')
        .update({ step_number: -(idx + 1) })
        .eq('id', item.id)
    )
  )

  // Pass 2: Set to correct positive values
  await Promise.all(
    items.map((item, idx) =>
      supabase
        .from('checklist_items')
        .update({ step_number: idx + 1 })
        .eq('id', item.id)
    )
  )
}

/* ------------------------------------------------------------------ */
/*  importChecklist                                                    */
/* ------------------------------------------------------------------ */

export async function importChecklist(
  projectId: string,
  slug: string,
  _prevState: ChecklistActionState,
  formData: FormData
): Promise<ChecklistActionState> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    if (!file || file.size === 0) {
      return { error: 'Please select a file' }
    }

    const fileName = file.name
    if (!fileName.match(/\.(xlsx|csv)$/i)) {
      return { error: 'File must be .xlsx or .csv' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { items, errors } = await parseChecklistFile(buffer, fileName)

    if (errors.length > 0 && items.length === 0) {
      return { errors }
    }

    if (items.length === 0) {
      return { error: 'No valid checklist items found in the file' }
    }

    const supabase = createAdminClient()

    // Delete existing items for this project
    await supabase.from('checklist_items').delete().eq('project_id', projectId)

    // Batch insert new items
    const rows = items.map((item) => ({
      project_id: projectId,
      step_number: item.stepNumber,
      path: item.path,
      actor: item.actor,
      action: item.action,
      view_sample: item.viewSample,
      crm_module: item.crmModule,
      tip: item.tip,
      sort_order: item.sortOrder,
    }))

    const { error } = await supabase.from('checklist_items').insert(rows)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/projects/${slug}`)
    return {
      success: true,
      itemCount: items.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (err) {
    console.error('importChecklist error:', err)
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred during import',
    }
  }
}

/* ------------------------------------------------------------------ */
/*  updateChecklistItem                                                */
/* ------------------------------------------------------------------ */

export async function updateChecklistItem(
  slug: string,
  data: unknown
): Promise<{ error?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const parsed = updateChecklistItemSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid data' }
    }

    const supabase = createAdminClient()
    const updates: ChecklistItemUpdate = {}
    if (parsed.data.stepNumber !== undefined) updates.step_number = parsed.data.stepNumber
    if (parsed.data.path !== undefined) updates.path = parsed.data.path
    if (parsed.data.actor !== undefined) updates.actor = parsed.data.actor
    if (parsed.data.action !== undefined) updates.action = parsed.data.action
    if (parsed.data.viewSample !== undefined) updates.view_sample = parsed.data.viewSample || null
    if (parsed.data.crmModule !== undefined) updates.crm_module = parsed.data.crmModule || null
    if (parsed.data.tip !== undefined) updates.tip = parsed.data.tip || null

    const { error } = await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', parsed.data.id)

    if (error) return { error: error.message }

    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('updateChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

/* ------------------------------------------------------------------ */
/*  addChecklistItem                                                   */
/* ------------------------------------------------------------------ */

export async function addChecklistItem(
  slug: string,
  data: unknown
): Promise<{ error?: string; id?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const parsed = addChecklistItemSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid data' }
    }

    const supabase = createAdminClient()

    // Get max sort_order and step_number for this project
    const { data: maxItem } = await supabase
      .from('checklist_items')
      .select('sort_order, step_number')
      .eq('project_id', parsed.data.projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = (maxItem?.sort_order || 0) + 1
    // Use provided stepNumber or auto-calculate (will be corrected by renumber)
    const stepNumber = parsed.data.stepNumber ?? (maxItem?.step_number || 0) + 1

    const { data: newItem, error } = await supabase
      .from('checklist_items')
      .insert({
        project_id: parsed.data.projectId,
        step_number: stepNumber,
        path: parsed.data.path,
        actor: parsed.data.actor,
        action: parsed.data.action,
        view_sample: parsed.data.viewSample || null,
        crm_module: parsed.data.crmModule || null,
        tip: parsed.data.tip || null,
        sort_order: sortOrder,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    // Renumber all steps to ensure sequential step_numbers
    await renumberSteps(parsed.data.projectId, supabase)

    revalidatePath(`/admin/projects/${slug}`)
    return { id: newItem?.id }
  } catch (err) {
    console.error('addChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

/* ------------------------------------------------------------------ */
/*  deleteChecklistItem                                                */
/* ------------------------------------------------------------------ */

export async function deleteChecklistItem(
  slug: string,
  itemId: string
): Promise<{ error?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // Look up project_id before deleting so we can renumber
    const { data: item } = await supabase
      .from('checklist_items')
      .select('project_id')
      .eq('id', itemId)
      .single()

    const projectId = item?.project_id

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)

    if (error) return { error: error.message }

    // Renumber remaining steps
    if (projectId) {
      await renumberSteps(projectId, supabase)
    }

    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('deleteChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

/* ------------------------------------------------------------------ */
/*  reorderChecklistItems                                              */
/* ------------------------------------------------------------------ */

export async function reorderChecklistItems(
  slug: string,
  data: unknown
): Promise<{ error?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const parsed = reorderChecklistSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid data' }
    }

    const supabase = createAdminClient()

    // Update each item's sort_order
    const updates = parsed.data.items.map((item) =>
      supabase
        .from('checklist_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) return { error: firstError.error.message }

    // Renumber step_numbers to match new sort_order
    await renumberSteps(parsed.data.projectId, supabase)

    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('reorderChecklistItems error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

/* ------------------------------------------------------------------ */
/*  duplicateChecklistItem                                             */
/* ------------------------------------------------------------------ */

export async function duplicateChecklistItem(
  slug: string,
  itemId: string
): Promise<{ error?: string; item?: { id: string; project_id: string; step_number: number; path: string | null; actor: string; action: string; view_sample: string | null; crm_module: string | null; tip: string | null; sort_order: number } }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // Fetch the source item
    const { data: source } = await supabase
      .from('checklist_items')
      .select('id, project_id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample')
      .eq('id', itemId)
      .single()

    if (!source) return { error: 'Step not found' }

    // Get current max sort_order for this project
    const { data: maxRow } = await supabase
      .from('checklist_items')
      .select('sort_order')
      .eq('project_id', source.project_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const newSortOrder = (maxRow?.sort_order ?? 0) + 1

    // Insert copy at end
    const { data: newItem, error } = await supabase
      .from('checklist_items')
      .insert({
        project_id: source.project_id,
        step_number: newSortOrder,
        path: source.path,
        actor: source.actor,
        action: source.action,
        view_sample: source.view_sample,
        crm_module: source.crm_module,
        tip: source.tip,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    await renumberSteps(source.project_id, supabase)
    revalidatePath(`/admin/projects/${slug}`)
    return { item: newItem ?? undefined }
  } catch (err) {
    console.error('duplicateChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

/* ------------------------------------------------------------------ */
/*  bulkDeleteChecklistItems                                           */
/* ------------------------------------------------------------------ */

export async function bulkDeleteChecklistItems(
  slug: string,
  itemIds: string[]
): Promise<{ error?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    if (itemIds.length === 0) return { error: 'No items selected' }

    const supabase = createAdminClient()

    // Look up project_id from first item
    const { data: first } = await supabase
      .from('checklist_items')
      .select('project_id')
      .eq('id', itemIds[0])
      .single()

    if (!first) return { error: 'Items not found' }

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .in('id', itemIds)

    if (error) return { error: error.message }

    await renumberSteps(first.project_id, supabase)
    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('bulkDeleteChecklistItems error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}
