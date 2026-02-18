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
  Candidate: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Talkpush: "bg-purple-50 text-purple-700 border-purple-200",
  Recruiter: "bg-teal-50 text-teal-700 border-teal-200",
}

export const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

/** Renumber items client-side: step_number = position (1-indexed) */
export function renumberItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item, idx) => ({ ...item, step_number: idx + 1 }))
}
