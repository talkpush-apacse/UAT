import { errorCategoryFor, trackEvent, type ViewMode } from "@/lib/mixpanel"

// Shared by the classic and wizard views so both report "Test Completed" /
// "Mark Complete Failed" with identical properties.

export function trackTestCompleted(
  projectSlug: string,
  viewMode: ViewMode,
  stepItems: { id: string }[],
  responses: Record<string, { status: string | null } | undefined>
): void {
  const counts = { pass: 0, fail: 0, na: 0, blocked: 0, review: 0 }
  for (const item of stepItems) {
    switch (responses[item.id]?.status) {
      case "Pass": counts.pass++; break
      case "Fail": counts.fail++; break
      case "N/A": counts.na++; break
      case "Blocked": counts.blocked++; break
      case "Up For Review": counts.review++; break
    }
  }
  trackEvent("Test Completed", {
    project_slug: projectSlug,
    view_mode: viewMode,
    total_steps: stepItems.length,
    ...counts,
  })
}

// `markTestComplete` returns human-readable strings (some are raw database
// messages), so map the known ones to a category and never send the text.
export function trackMarkCompleteFailed(projectSlug: string, viewMode: ViewMode, error: unknown): void {
  let category: "missing_evidence" | ReturnType<typeof errorCategoryFor>
  if (typeof error === "string") {
    category = /missing a comment or screenshot/i.test(error)
      ? "missing_evidence"
      : /tester not found/i.test(error)
        ? "not_found"
        : errorCategoryFor({ message: error })
  } else {
    // Thrown by the server action call itself (e.g. offline → TypeError)
    category = errorCategoryFor(error)
  }
  trackEvent("Mark Complete Failed", {
    project_slug: projectSlug,
    view_mode: viewMode,
    error_category: category,
  })
}
