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

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', id)
    .single()

  if (!client) return { error: 'Client not found' }

  // Check if any projects are linked to this client
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)

  if (count && count > 0) {
    return {
      error: `Cannot delete "${client.name}" — ${count} UAT checklist${count > 1 ? 's' : ''} still use this client`,
    }
  }

  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) return { error: error.message }

  const { data: logoFiles } = await supabase.storage.from('client-logos').list(id)
  if (logoFiles && logoFiles.length > 0) {
    await supabase.storage.from('client-logos').remove(logoFiles.map((f) => `${id}/${f.name}`))
  }

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

const LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX_SIZE = 2 * 1024 * 1024 // 2MB — must match the client-logos bucket limit

export async function uploadClientLogo(
  clientId: string,
  formData: FormData
): Promise<{ error?: string; logoUrl?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'No file provided' }

  if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Logo must be a PNG, JPEG, or WEBP image' }
  }
  if (file.size > LOGO_MAX_SIZE) {
    return { error: 'Logo must be smaller than 2MB' }
  }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { error: 'Client not found' }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${clientId}/logo.${extension}`

  // Clear out any previously uploaded logo with a different extension so
  // switching file types doesn't leave an orphaned file behind.
  const { data: existingFiles } = await supabase.storage.from('client-logos').list(clientId)
  const staleFiles = (existingFiles ?? [])
    .map((f) => `${clientId}/${f.name}`)
    .filter((p) => p !== path)
  if (staleFiles.length > 0) {
    await supabase.storage.from('client-logos').remove(staleFiles)
  }

  const { error: uploadError } = await supabase.storage
    .from('client-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: publicUrlData } = supabase.storage.from('client-logos').getPublicUrl(path)
  // Cache-bust so browsers pick up a replaced logo immediately.
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('clients')
    .update({ logo_url: logoUrl })
    .eq('id', clientId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/clients')
  return { logoUrl }
}

export async function removeClientLogo(clientId: string): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()

  const { data: existingFiles } = await supabase.storage.from('client-logos').list(clientId)
  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from('client-logos')
      .remove(existingFiles.map((f) => `${clientId}/${f.name}`))
  }

  const { error } = await supabase
    .from('clients')
    .update({ logo_url: null })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/admin/clients')
  return {}
}
