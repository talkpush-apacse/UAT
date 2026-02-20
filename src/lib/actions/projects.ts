'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project'
import type { Database } from '@/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type ProjectRow = Database['public']['Tables']['projects']['Row']

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
    talkpushLoginLink: formData.get('talkpushLoginLink'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('projects').insert({
    company_name: parsed.data.companyName,
    slug: parsed.data.slug,
    test_scenario: parsed.data.testScenario || null,
    talkpush_login_link: parsed.data.talkpushLoginLink || null,
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
    talkpushLoginLink: formData.get('talkpushLoginLink'),
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
  if (parsed.data.talkpushLoginLink !== undefined)
    updates.talkpush_login_link = parsed.data.talkpushLoginLink || null

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

/* ------------------------------------------------------------------ */
/*  deleteProject                                                      */
/* ------------------------------------------------------------------ */

export async function deleteProject(
  projectId: string,
): Promise<{ error?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return {}
}

/* ------------------------------------------------------------------ */
/*  duplicateProject                                                   */
/* ------------------------------------------------------------------ */

export async function duplicateProject(
  projectId: string,
  slug: string,
): Promise<{ error?: string; newSlug?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createAdminClient()

  // Fetch original project
  const { data: original } = await supabase
    .from('projects')
    .select('id, slug, company_name, test_scenario, talkpush_login_link')
    .eq('id', projectId)
    .single()

  if (!original) return { error: 'Project not found' }

  // Generate unique slug: "{slug}-copy", then "{slug}-copy-2", etc.
  let newSlug = `${slug}-copy`
  let suffix = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', newSlug)
      .maybeSingle()
    if (!existing) break
    newSlug = `${slug}-copy-${suffix++}`
  }

  // Insert new project
  const { data: newProject, error: projError } = await supabase
    .from('projects')
    .insert({
      company_name: `${(original as ProjectRow).company_name} (Copy)`,
      slug: newSlug,
      test_scenario: (original as ProjectRow).test_scenario,
      talkpush_login_link: (original as ProjectRow).talkpush_login_link,
    })
    .select()
    .single()

  if (projError) return { error: projError.message }

  // Fetch and copy all checklist items
  const { data: items } = await supabase
    .from('checklist_items')
    .select('id, project_id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample')
    .eq('project_id', projectId)
    .order('sort_order')

  if (items && items.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copies = items.map(({ id, project_id, ...rest }) => ({
      ...rest,
      project_id: newProject!.id,
    }))
    const { error: itemsError } = await supabase
      .from('checklist_items')
      .insert(copies)
    if (itemsError) return { error: itemsError.message }
  }

  revalidatePath('/admin')
  return { newSlug }
}
