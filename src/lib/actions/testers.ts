'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { registerTesterSchema } from '@/lib/schemas/tester'

export interface RegisterTesterState {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  testerId?: string
  returning?: boolean
  testerName?: string
}

export async function registerTester(
  _prevState: RegisterTesterState,
  formData: FormData
): Promise<RegisterTesterState> {
  const parsed = registerTesterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    mobile: formData.get('mobile'),
    projectId: formData.get('projectId'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createServerSupabaseClient()

  // Check for existing tester by email
  const { data: existingByEmail } = await supabase
    .from('testers')
    .select('id, name')
    .eq('project_id', parsed.data.projectId)
    .eq('email', parsed.data.email)
    .single()

  if (existingByEmail) {
    return {
      success: true,
      testerId: existingByEmail.id,
      returning: true,
      testerName: existingByEmail.name,
    }
  }

  // Check for existing tester by mobile
  const { data: existingByMobile } = await supabase
    .from('testers')
    .select('id, name')
    .eq('project_id', parsed.data.projectId)
    .eq('mobile', parsed.data.mobile)
    .single()

  if (existingByMobile) {
    return {
      success: true,
      testerId: existingByMobile.id,
      returning: true,
      testerName: existingByMobile.name,
    }
  }

  // Insert new tester
  const { data: newTester, error } = await supabase
    .from('testers')
    .insert({
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      email: parsed.data.email,
      mobile: parsed.data.mobile,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'A tester with this email or mobile already exists for this project' }
    }
    return { error: error.message }
  }

  return {
    success: true,
    testerId: newTester!.id,
    returning: false,
  }
}

export async function markTestComplete(
  testerId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('testers')
    .update({ test_completed: 'Yes' })
    .eq('id', testerId)
  if (error) return { error: error.message }
  return {}
}

export async function deleteTester(
  slug: string,
  testerId: string
): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('testers')
    .delete()
    .eq('id', testerId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/projects/${slug}`)
  return {}
}
