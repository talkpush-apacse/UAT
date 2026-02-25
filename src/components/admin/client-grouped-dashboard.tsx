"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  ChevronsUpDown,
} from "lucide-react"

export interface ProjectWithCounts {
  id: string
  slug: string
  company_name: string
  title: string | null
  test_scenario: string | null
  created_at: string
  testerCount: number
  signoffCount: number
}

export interface ClientGroup {
  clientName: string
  projects: ProjectWithCounts[]
}

interface Props {
  groups: ClientGroup[]
}

export default function ClientGroupedDashboard({ groups }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.clientName))
  )
  const [searchQuery, setSearchQuery] = useState("")

  const toggleGroup = (clientName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(clientName)) {
        next.delete(clientName)
      } else {
        next.add(clientName)
      }
      return next
    })
  }

  const expandAll = () =>
    setExpandedGroups(new Set(filteredGroups.map((g) => g.clientName)))
  const collapseAll = () => setExpandedGroups(new Set())

  const filteredGroups = groups
    .map((group) => {
      const query = searchQuery.toLowerCase()
      // If client name matches, show entire section with all projects
      if (group.clientName.toLowerCase().includes(query)) {
        return group
      }
      // Otherwise, filter to only matching projects within the section
      const matchingProjects = group.projects.filter(
        (p) =>
          p.company_name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          (p.title && p.title.toLowerCase().includes(query))
      )
      if (matchingProjects.length > 0) {
        return { ...group, projects: matchingProjects }
      }
      return null
    })
    .filter((g): g is ClientGroup => g !== null)

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by client or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <button
          onClick={expandAll}
          className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap flex items-center gap-1"
        >
          <ChevronsUpDown className="h-3 w-3" />
          Expand All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Collapse All
        </button>
      </div>

      {/* Client sections */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No results matching &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        filteredGroups.map((group) => {
          const isOpen = expandedGroups.has(group.clientName)

          return (
            <div
              key={group.clientName}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => toggleGroup(group.clientName)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-base font-semibold text-gray-900">
                    {group.clientName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                  >
                    {group.projects.length}{" "}
                    {group.projects.length === 1 ? "checklist" : "checklists"}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Project cards grid */}
              {isOpen && (
                <div className="p-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {group.projects.map((project) => {
                      const status =
                        project.signoffCount > 0
                          ? {
                              label: "Signed Off",
                              color:
                                "bg-green-50 text-green-700 border-green-200",
                            }
                          : project.testerCount === 0
                            ? {
                                label: "Not Started",
                                color:
                                  "bg-gray-100 text-gray-500 border-gray-200",
                              }
                            : {
                                label: "In Progress",
                                color:
                                  "bg-blue-50 text-blue-700 border-blue-200",
                              }

                      return (
                        <Link
                          key={project.id}
                          href={`/admin/projects/${project.slug}`}
                        >
                          <Card className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer h-full">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <CardTitle
                                  className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug"
                                  title={project.title || project.company_name}
                                >
                                  {project.title || project.company_name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${status.color}`}
                                >
                                  {status.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400 font-mono">
                                /{project.slug}
                              </p>
                            </CardHeader>
                            <CardContent>
                              {project.test_scenario && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                  {project.test_scenario}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {project.testerCount} tester
                                  {project.testerCount !== 1 ? "s" : ""}
                                </span>
                                <span>
                                  {new Date(
                                    project.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
