export interface ChecklistItem {
  id: string
  project_id: string
  step_number: number | null
  path: string | null
  actor: string
  action: string
  view_sample: string | null
  crm_module: string | null
  tip: string | null
  sort_order: number
  item_type: string
  header_label: string | null
}

export { ACTOR_COLORS as ACTOR_STYLES } from "@/lib/constants"

export const PATH_STYLES: Record<string, string> = {
  Happy: "bg-green-50 text-green-700 border-green-200",
  "Non-Happy": "bg-orange-50 text-orange-700 border-orange-200",
}

/** A checklist item with `item_type === 'phase_header'` doesn't consume a step number. */
export function isPhaseHeader(item: { item_type: string }): boolean {
  return item.item_type === "phase_header"
}

/**
 * Renumber items client-side so testable steps get sequential numbers (1..N)
 * while phase headers keep their position via `sort_order` but have
 * `step_number = null`. Mirrors the server-side `renumber_steps` RPC.
 */
export function renumberItems(items: ChecklistItem[]): ChecklistItem[] {
  let n = 0
  return items.map((item) => {
    if (isPhaseHeader(item)) return { ...item, step_number: null }
    n += 1
    return { ...item, step_number: n }
  })
}
