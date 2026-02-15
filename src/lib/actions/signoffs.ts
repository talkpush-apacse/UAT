'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { createSignoffSchema } from '@/lib/schemas/signoff'

export interface SignoffActionState {
  error?: string
  success?: boolean
}

export async function addSignoff(
  slug: string,
  _prevState: SignoffActionState,
  formData: FormData
): Promise<SignoffActionState> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const parsed = createSignoffSchema.safeParse({
    projectId: formData.get('projectId'),
    signoffName: formData.get('signoffName'),
    signoffDate: formData.get('signoffDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid data' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('signoffs').insert({
    project_id: parsed.data.projectId,
    signoff_name: parsed.data.signoffName,
    signoff_date: parsed.data.signoffDate,
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/projects/${slug}`)
  revalidatePath(`/admin/projects/${slug}/signoff`)
  return { success: true }
}

export async function deleteSignoff(
  slug: string,
  signoffId: string
): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('signoffs')
    .delete()
    .eq('id', signoffId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/projects/${slug}`)
  revalidatePath(`/admin/projects/${slug}/signoff`)
  return {}
}
