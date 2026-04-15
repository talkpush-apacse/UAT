import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const DEFAULT_PROJECT_SLUG = 'uat-checklist'
const MAX_PROJECT_SLUG_LENGTH = 100
const SLUG_CANDIDATE_BATCH_SIZE = 50

function trimSlug(slug: string, maxLength = MAX_PROJECT_SLUG_LENGTH) {
  return slug.slice(0, maxLength).replace(/-+$/g, '') || DEFAULT_PROJECT_SLUG
}

export function slugifyProjectTitle(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return trimSlug(slug || DEFAULT_PROJECT_SLUG)
}

function buildSlugCandidate(baseSlug: string, index: number) {
  if (index === 0) return trimSlug(baseSlug)

  const suffix = `-${index + 1}`
  const trimmedBase = trimSlug(
    baseSlug,
    MAX_PROJECT_SLUG_LENGTH - suffix.length
  )

  return `${trimmedBase}${suffix}`
}

export async function generateUniqueProjectSlug(
  supabase: SupabaseClient<Database>,
  value: string
) {
  const baseSlug = slugifyProjectTitle(value)
  let offset = 0

  while (true) {
    const candidates = Array.from(
      { length: SLUG_CANDIDATE_BATCH_SIZE },
      (_, index) => buildSlugCandidate(baseSlug, offset + index)
    )

    const { data, error } = await supabase
      .from('projects')
      .select('slug')
      .in('slug', candidates)

    if (error) throw new Error(error.message)

    const taken = new Set((data ?? []).map((row) => row.slug))
    const available = candidates.find((candidate) => !taken.has(candidate))

    if (available) return available

    offset += SLUG_CANDIDATE_BATCH_SIZE
  }
}
