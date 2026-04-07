'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'

export async function addClient(name: string): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200) {
    return { error: 'Client name must be between 1 and 200 characters' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('clients').insert({ name: trimmed })

  if (error) {
    if (error.code === '23505') {
      return { error: 'A client with this name already exists' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin/projects/new')
  return {}
}

export async function deleteClient(
  id: string
): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()

  // Check if any projects reference this client name
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', id)
    .single()

  if (!client) return { error: 'Client not found' }

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('company_name', client.name)

  if (count && count > 0) {
    return {
      error: `Cannot delete "${client.name}" — ${count} project${count > 1 ? 's' : ''} still use this client name`,
    }
  }

  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/clients')
  revalidatePath('/admin/projects/new')
  return {}
}

export async function fetchClients(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('name')
    .order('name')

  return (data ?? []).map((c) => c.name)
}
