'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { saveResponseSchema } from '@/lib/schemas/response'

export async function saveResponse(
  data: unknown
): Promise<{ error?: string }> {
  const parsed = saveResponseSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid data' }
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from('responses').upsert(
    {
      tester_id: parsed.data.testerId,
      checklist_item_id: parsed.data.checklistItemId,
      status: parsed.data.status,
      comment: parsed.data.comment || null,
    },
    { onConflict: 'tester_id,checklist_item_id' }
  )

  if (error) return { error: error.message }
  return {}
}
