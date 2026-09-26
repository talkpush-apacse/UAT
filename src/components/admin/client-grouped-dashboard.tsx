"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Building2, Search, SearchX, ChevronRight, Clock3, Plus } from "lucide-react"
import type { ProjectStatus } from "@/lib/utils/project-status"

export type { ProjectStatus }

export interface ProjectWithCounts {
  id: string
  slug: string
  company_name: string
  title: string | null
  test_scenario: string | null
  created_at: string | null
  client_id?: string | null
  testerCount: number
  signoffCount: number
  stepCount?: number
  openFindingCount?: number
  status?: ProjectStatus
  lastActivityAt?: string | null
}

export interface ClientGroup {
  clientName: string
  logoUrl?: string | null
  activeCount?: number
  completedCount?: number
  projects: ProjectWithCounts[]
}

interface Props {
  groups: ClientGroup[]
  recentlyAccessed?: ProjectWithCounts[]
  attentionProjects?: ProjectWithCounts[]
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "No activity yet"
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return "No activity yet"

  const diffMs = Date.now() - timestamp
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(value).toLocaleDateString()
}

function getNextAction(project: ProjectWithCounts) {
  if ((project.stepCount ?? 0) === 0) return "Add steps"
  if (project.testerCount === 0) return "Share tester link"
  if ((project.openFindingCount ?? 0) > 0) return "Review findings"
  if (project.signoffCount === 0) return "Record sign-off"
  return "View report"
}

export default function ClientGroupedDashboard({
  groups,
  recentlyAccessed = [],
  attentionProjects = [],
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const savedQuery = window.localStorage.getItem("uat-admin-client-search")
    if (savedQuery) setSearchQuery(savedQuery)
  }, [])

  useEffect(() => {
    window.localStorage.setItem("uat-admin-client-search", searchQuery)
  }, [searchQuery])

  const filteredGroups = groups.filter((group) =>
    group.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {(attentionProjects.length > 0 || recentlyAccessed.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {attentionProjects.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Needs Attention
              </h2>
              <div className="mt-3 space-y-2">
                {attentionProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {project.title || project.company_name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {project.company_name} · {formatRelativeDate(project.lastActivityAt)} · {getNextAction(project)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {(project.openFindingCount ?? 0) > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          {project.openFindingCount} open
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-amber-700" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {recentlyAccessed.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Clock3 className="h-4 w-4 text-gray-400" />
                Recent Activity
              </h2>
              <div className="mt-3 space-y-2">
                {recentlyAccessed.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-800">
                        {project.title || project.company_name}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formatRelativeDate(project.lastActivityAt)}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-gray-500">{getNextAction(project)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker focus:outline-none"
        />
      </div>

      {/* Empty search state */}
      {filteredGroups.length === 0 && searchQuery && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <SearchX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            No clients match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-gray-400 mb-5">Try a different client name.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-brand-sage-darker font-medium hover:underline"
            >
              Clear filter
            </button>
            <span className="text-gray-300">·</span>
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-1 text-sm text-brand-sage-darker font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              New UAT Checklist
            </Link>
          </div>
        </div>
      )}

      {/* Client cards grid */}
      {filteredGroups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const signedOffCount = group.projects.filter((p) => p.signoffCount > 0).length
            const openFindingCount = group.projects.reduce(
              (sum, project) => sum + (project.openFindingCount ?? 0),
              0
            )
            const inProgressCount = group.projects.filter(
              (p) => p.signoffCount === 0 && p.testerCount > 0
            ).length
            const notStartedCount = group.projects.filter(
              (p) => p.signoffCount === 0 && p.testerCount === 0
            ).length

            return (
              <Link
                key={group.clientName}
                href={`/admin?client=${encodeURIComponent(group.clientName)}`}
                className="group block outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker rounded-xl"
              >
                <Card className="relative bg-white border border-gray-100 border-t-4 border-t-brand-sage-darker shadow-sm group-hover:shadow-md group-hover:border-gray-200 transition-all duration-200 h-full cursor-pointer">
                  <CardContent className="p-5">
                    {/* Icon + Name + Arrow */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-brand-sage-lightest rounded-lg flex items-center justify-center overflow-hidden">
                          {group.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={group.logoUrl}
                              alt=""
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-brand-sage-darker" />
                          )}
                        </div>
                        <h3 className="text-[15px] font-semibold text-gray-800 leading-snug group-hover:text-brand-sage-darker transition-colors line-clamp-2">
                          {group.clientName}
                        </h3>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-sage-darker transition-colors flex-shrink-0 mt-1" />
                    </div>

                    {/* Checklist count */}
                    <p className="text-sm text-gray-500 mb-3 ml-[52px]">
                      <span className="tabular-nums font-semibold text-gray-800">
                        {group.projects.length}
                      </span>{" "}
                      {group.projects.length === 1 ? "UAT checklist" : "UAT checklists"}
                    </p>

                    {/* Status summary badges */}
                    <div className="flex flex-wrap gap-1.5 ml-[52px]">
                      {signedOffCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {signedOffCount} Signed Off
                        </span>
                      )}
                      {openFindingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          {openFindingCount} Open
                        </span>
                      )}
                      {inProgressCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {inProgressCount} In Progress
                        </span>
                      )}
                      {notStartedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          {notStartedCount} Not Started
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
