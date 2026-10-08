/* ------------------------------------------------------------------ */
/*  Tester-facing grouping of admin resolution statuses                */
/*                                                                    */
/*  Admins save one of: Not Yet Started, In Progress, For Retesting,  */
/*  Done (see review-panel.tsx). Testers see three groups. Both the   */
/*  results page and the notify email use this so they always agree.  */
/* ------------------------------------------------------------------ */

export type ResolutionGroup = "pending" | "in-progress" | "resolved"

export function resolutionGroup(status: string | null | undefined): ResolutionGroup {
  switch (status) {
    case "Done":
    case "resolved":
      return "resolved"
    case "In Progress":
    case "in-progress":
      return "in-progress"
    default:
      // Not Yet Started, For Retesting, no review yet, or anything unknown
      return "pending"
  }
}
