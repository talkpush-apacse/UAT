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

type ChecklistItemUpdate = Database['public']['Tables']['checklist_items']['Update']

export interface ChecklistActionState {
  error?: string
  errors?: string[]
  success?: boolean
  itemCount?: number
}

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

    // Get max sort_order for this project
    const { data: maxItem } = await supabase
      .from('checklist_items')
      .select('sort_order')
      .eq('project_id', parsed.data.projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = (maxItem?.sort_order || 0) + 1

    const { data: newItem, error } = await supabase
      .from('checklist_items')
      .insert({
        project_id: parsed.data.projectId,
        step_number: parsed.data.stepNumber,
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

    revalidatePath(`/admin/projects/${slug}`)
    return { id: newItem?.id }
  } catch (err) {
    console.error('addChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

export async function deleteChecklistItem(
  slug: string,
  itemId: string
): Promise<{ error?: string }> {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return { error: 'Unauthorized' }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)

    if (error) return { error: error.message }

    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('deleteChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}

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

    revalidatePath(`/admin/projects/${slug}`)
    return {}
  } catch (err) {
    console.error('reorderChecklistItems error:', err)
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}
