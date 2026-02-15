'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project'
import type { Database } from '@/lib/types/database'

type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export interface ProjectActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createProject(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const parsed = createProjectSchema.safeParse({
    companyName: formData.get('companyName'),
    slug: formData.get('slug'),
    testScenario: formData.get('testScenario'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('projects').insert({
    company_name: parsed.data.companyName,
    slug: parsed.data.slug,
    test_scenario: parsed.data.testScenario || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'A project with this slug already exists' }
    }
    return { error: error.message }
  }

  redirect(`/admin/projects/${parsed.data.slug}`)
}

export async function updateProject(
  projectId: string,
  currentSlug: string,
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const parsed = updateProjectSchema.safeParse({
    companyName: formData.get('companyName'),
    slug: formData.get('slug'),
    testScenario: formData.get('testScenario'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const updates: ProjectUpdate = {}
  if (parsed.data.companyName) updates.company_name = parsed.data.companyName
  if (parsed.data.slug) updates.slug = parsed.data.slug
  if (parsed.data.testScenario !== undefined)
    updates.test_scenario = parsed.data.testScenario || null

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'A project with this slug already exists' }
    }
    return { error: error.message }
  }

  const newSlug = parsed.data.slug || currentSlug
  revalidatePath('/admin')
  revalidatePath(`/admin/projects/${newSlug}`)
  redirect(`/admin/projects/${newSlug}`)
}
