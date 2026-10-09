'use server'

import { revalidatePath } from 'next/cache'
import { createAnonSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'
import { registerTesterSchema, lookupTesterSchema } from '@/lib/schemas/tester'
import { getStepsMissingEvidence } from '@/lib/utils/response-validation'
import { notifyTestSubmitted } from '@/lib/email/notify-test-submitted'

export interface RegisterTesterState {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  testerId?: string
  returning?: boolean
  testerName?: string
}

export interface LookupTesterResult {
  error?: string
  found?: boolean
  testerId?: string
  testerName?: string
}

// Email-first sign-in for returning testers. Exposes nothing registerTester
// didn't already: that action also returns an existing tester's id and name
// for a matching email (name/mobile values are not checked).
export async function lookupTesterByEmail(
  projectId: string,
  email: string
): Promise<LookupTesterResult> {
  const parsed = lookupTesterSchema.safeParse({ projectId, email })
  if (!parsed.success) return { error: 'Enter a valid email' }

  const supabase = createAnonSupabaseClient()
  const { data, error } = await supabase
    .from('testers')
    .select('id, name')
    .eq('project_id', parsed.data.projectId)
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (!data) return { found: false }
  return { found: true, testerId: data.id, testerName: data.name }
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

  const supabase = createAnonSupabaseClient()

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
      // Concurrent submission raced this one to the insert — look up whoever
      // won so this request still completes as a normal returning-tester
      // flow instead of surfacing a bare error requiring a resubmit. Two
      // separate .eq() lookups (matching the checks above) rather than a
      // single .or() filter, since `mobile` has no format constraint and
      // could contain characters that break PostgREST's .or() syntax.
      const { data: winnerByEmail } = await supabase
        .from('testers')
        .select('id, name')
        .eq('project_id', parsed.data.projectId)
        .eq('email', parsed.data.email)
        .single()

      const winner =
        winnerByEmail ??
        (
          await supabase
            .from('testers')
            .select('id, name')
            .eq('project_id', parsed.data.projectId)
            .eq('mobile', parsed.data.mobile)
            .single()
        ).data

      if (winner) {
        return {
          success: true,
          testerId: winner.id,
          returning: true,
          testerName: winner.name,
        }
      }

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
  const supabase = createAnonSupabaseClient()

  // Verify the tester exists before updating
  const { data: tester } = await supabase
    .from('testers')
    .select('id')
    .eq('id', testerId)
    .single()

  if (!tester) return { error: 'Tester not found' }

  const { data: responses, error: responsesError } = await supabase
    .from('responses')
    .select('id, checklist_item_id, status, comment')
    .eq('tester_id', testerId)

  if (responsesError) return { error: responsesError.message }

  const responseIds = (responses ?? []).map((r) => r.id)
  const { data: attachments, error: attachmentsError } = responseIds.length
    ? await supabase
        .from('attachments')
        .select('response_id')
        .in('response_id', responseIds)
    : { data: [], error: null }

  if (attachmentsError) return { error: attachmentsError.message }

  const stepsMissingEvidence = getStepsMissingEvidence(responses ?? [], attachments ?? [])
  if (stepsMissingEvidence.length > 0) {
    return { error: 'Some failed, blocked, or up-for-review steps are missing a comment or screenshot.' }
  }

  // Only match a tester who hasn't completed yet, and get the row back, so we
  // can tell the first completion apart from a repeat submit or double click.
  const { data: completed, error } = await supabase
    .from('testers')
    .update({ test_completed: 'Yes' })
    .eq('id', testerId)
    .is('test_completed', null)
    .select('id')
  if (error) return { error: error.message }

  // First completion only: one email per submission. The helper never throws
  // and gives up after a few seconds, so it can't break the tester's submit.
  if (completed && completed.length > 0) {
    await notifyTestSubmitted(testerId)
  }
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
