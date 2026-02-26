export interface ChecklistItem {
  id: string
  project_id: string
  step_number: number
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
  sort_order: number
}

export const ACTOR_STYLES: Record<string, string> = {
  Candidate: "bg-sky-50 text-sky-800 border-sky-200",
  Talkpush: "bg-brand-sage-lightest text-brand-sage-darker border-brand-sage-lighter",
  Recruiter: "bg-violet-50 text-violet-800 border-violet-200",
}

export const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

/** Renumber items client-side: step_number = position (1-indexed) */
export function renumberItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item, idx) => ({ ...item, step_number: idx + 1 }))
}
