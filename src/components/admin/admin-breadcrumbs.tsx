"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const SECTION_LABELS: Record<string, string> = {
  checklist: "Manage Steps",
  upload: "Upload UAT Sheet",
  review: "Review",
  signoff: "Sign Off",
  "ai-summary": "AI Summary",
  "training-plan": "Training Plan",
  edit: "Edit Project",
  new: "New Project",
}

interface ProjectInfo {
  company_name: string
  title: string | null
}

/**
 * Renders a breadcrumb trail in the nav bar using actual project names,
 * fetched client-side from /api/projects/[slug]/info.
 *
 * /admin                         → (nothing)
 * /admin/projects/[slug]         → > Accenture > Q1 2026 UAT
 * /admin/projects/[slug]/section → > Accenture > Q1 2026 UAT > Manage Steps
 */
export function AdminBreadcrumbs() {
  const pathname = usePathname()
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)

  const segments = pathname?.split("/").filter(Boolean) ?? []
  const slug = segments.length >= 3 && segments[2] !== "new" ? segments[2] : null
  const section = segments[3]

  // Fetch real names whenever the slug changes
  useEffect(() => {
    if (!slug) {
      setProjectInfo(null)
      return
    }
    let cancelled = false
    fetch(`/api/projects/${slug}/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setProjectInfo(data) })
      .catch(() => { if (!cancelled) setProjectInfo(null) })
    return () => { cancelled = true }
  }, [slug])

  // Root dashboard — no trail needed
  if (!pathname || pathname === "/admin") return null

  // Top-level admin pages (e.g. /admin/clients)
  const TOP_LEVEL_LABELS: Record<string, string> = {
    clients: "Manage Clients",
  }
  if (segments.length === 2 && TOP_LEVEL_LABELS[segments[1]]) {
    return (
      <div className="flex items-center gap-1 text-sm min-w-0">
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
        <span className="text-gray-600 font-medium">
          {TOP_LEVEL_LABELS[segments[1]]}
        </span>
      </div>
    )
  }

  if (segments.length < 3) return null

  // While loading, fall back to the slug so the breadcrumb doesn't flash empty
  const projectLabel = projectInfo
    ? (projectInfo.title || projectInfo.company_name)
    : slug

  return (
    <div className="flex items-center gap-1 text-sm min-w-0">
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />

      {section ? (
        // Sub-page: Accenture > Q1 2026 UAT (linked) > Manage Steps
        <>
          {projectInfo && (
            <>
              <span className="hidden sm:inline text-gray-400 truncate max-w-[100px]">
                {projectInfo.company_name}
              </span>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            </>
          )}
          <Link
            href={`/admin/projects/${slug}`}
            className="text-gray-400 hover:text-brand-sage-darker transition-colors truncate max-w-[150px]"
            title={projectLabel ?? undefined}
          >
            {projectLabel}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
          <span className="text-gray-600 font-medium truncate max-w-[140px]">
            {SECTION_LABELS[section] ?? section}
          </span>
        </>
      ) : (
        // Project detail page: Accenture > Q1 2026 UAT (current, non-linked)
        <>
          {projectInfo && (
            <>
              <span className="hidden sm:inline text-gray-400 truncate max-w-[100px]">
                {projectInfo.company_name}
              </span>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            </>
          )}
          <span className="text-gray-600 font-medium truncate max-w-[200px]" title={projectLabel ?? undefined}>
            {projectLabel}
          </span>
        </>
      )}
    </div>
  )
}
