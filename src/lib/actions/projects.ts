'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { generateUniqueProjectSlug } from '@/lib/utils/project-slug'
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project'
import type { Database } from '@/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    title: formData.get('title'),
    slug: formData.get('slug'),
    testScenario: formData.get('testScenario'),
    talkpushLoginLink: formData.get('talkpushLoginLink'),
    country: formData.get('country') ?? undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  let slug: string

  try {
    slug = await generateUniqueProjectSlug(
      supabase,
      parsed.data.slug || parsed.data.title
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to generate project slug' }
  }

  const { error } = await supabase.from('projects').insert({
    company_name: parsed.data.companyName,
    title: parsed.data.title,
    slug,
    test_scenario: parsed.data.testScenario || null,
    talkpush_login_link: parsed.data.talkpushLoginLink || null,
    country: parsed.data.country,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'A project with this slug already exists' }
    }
    return { error: error.message }
  }

  redirect(`/admin/projects/${slug}`)
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
    title: formData.get('title'),
    slug: formData.get('slug'),
    testScenario: formData.get('testScenario'),
    talkpushLoginLink: formData.get('talkpushLoginLink'),
    country: formData.get('country') ?? undefined,
    wizardMode: formData.get('wizardMode') ?? 'false',
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const updates: ProjectUpdate = {}
  if (parsed.data.companyName) updates.company_name = parsed.data.companyName
  if (parsed.data.title) updates.title = parsed.data.title
  if (parsed.data.slug) updates.slug = parsed.data.slug
  if (parsed.data.testScenario !== undefined)
    updates.test_scenario = parsed.data.testScenario || null
  if (parsed.data.talkpushLoginLink !== undefined)
    updates.talkpush_login_link = parsed.data.talkpushLoginLink || null
  if (parsed.data.country !== undefined)
    updates.country = parsed.data.country
  if (parsed.data.wizardMode !== undefined)
    updates.wizard_mode = parsed.data.wizardMode

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
  newTitle?: string,
): Promise<{ error?: string; newSlug?: string }> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createAdminClient()

  // Fetch original project
  const { data: original, error: originalError } = await supabase
    .from('projects')
    .select('id, company_name, title, test_scenario, talkpush_login_link, country')
    .eq('id', projectId)
    .single()

  if (originalError) return { error: originalError.message }
  if (!original) return { error: 'Project not found' }

  const duplicateTitle =
    newTitle?.trim() ||
    (original.title ? `${original.title} (Copy)` : `${original.company_name} (Copy)`)

  let newSlug: string

  try {
    newSlug = await generateUniqueProjectSlug(supabase, duplicateTitle)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to generate project slug' }
  }

  // Insert new project
  const { data: newProject, error: projError } = await supabase
    .from('projects')
    .insert({
      company_name: original.company_name,
      title: duplicateTitle,
      slug: newSlug,
      test_scenario: original.test_scenario,
      talkpush_login_link: original.talkpush_login_link,
      country: original.country,
    })
    .select()
    .single()

  if (projError) return { error: projError.message }
  if (!newProject) return { error: 'Failed to create duplicated project' }

  // Fetch and copy all checklist items
  const { data: items, error: itemsFetchError } = await supabase
    .from('checklist_items')
    .select('id, project_id, step_number, path, actor, action, crm_module, tip, sort_order, view_sample')
    .eq('project_id', projectId)
    .order('sort_order')

  if (itemsFetchError) {
    await supabase.from('projects').delete().eq('id', newProject.id)
    return { error: itemsFetchError.message }
  }

  if (items && items.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copies = items.map(({ id, project_id, ...rest }) => ({
      ...rest,
      project_id: newProject.id,
    }))
    const { error: itemsError } = await supabase
      .from('checklist_items')
      .insert(copies)
    if (itemsError) {
      await supabase.from('projects').delete().eq('id', newProject.id)
      return { error: itemsError.message }
    }
  }

  revalidatePath('/admin')
  return { newSlug }
}
