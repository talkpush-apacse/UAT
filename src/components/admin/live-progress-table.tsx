"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteTester } from "@/lib/actions/testers"
import { Users, ExternalLink, Trash2, RefreshCw, AlertTriangle } from "lucide-react"

export interface TesterProgress {
  id: string
  name: string
  email: string
  mobile: string
  total: number
  completed: number
  pass: number
  fail: number
  na: number
  blocked: number
}

export default function LiveProgressTable({
  slug,
  totalItems,
  initialTesters,
}: {
  slug: string
  totalItems: number
  initialTesters?: TesterProgress[]
}) {
  const [testers, setTesters] = useState<TesterProgress[]>(initialTesters || [])
  const [loading, setLoading] = useState(!initialTesters || initialTesters.length === 0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialTesters && initialTesters.length > 0 ? new Date() : null
  )
  const [fetchError, setFetchError] = useState(false)
  const [secondsSince, setSecondsSince] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/progress`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const newTesters: TesterProgress[] = data.testers || []
        setTesters(prev => {
          // Never silently drop testers — only replace if we got at least as many
          // as we currently have (a tester can only disappear via explicit delete,
          // which removes them from state directly via handleDelete).
          if (newTesters.length >= prev.length) return newTesters
          // If we got fewer than expected (transient DB issue / race condition),
          // keep all existing testers but update progress stats for any that returned.
          const updatedMap = new Map(newTesters.map(t => [t.id, t]))
          return prev.map(t => updatedMap.get(t.id) ?? t)
        })
        setLastUpdated(new Date())
        setSecondsSince(0)
        setFetchError(false)
      } else {
        setFetchError(true)
      }
    } catch {
      // Network error — keep existing data, show warning
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  // Start polling on mount; re-start if fetchProgress changes
  useEffect(() => {
    if (!initialTesters || initialTesters.length === 0) {
      fetchProgress()
    }
    intervalRef.current = setInterval(fetchProgress, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchProgress, initialTesters])

  // Tick "seconds since last update" every second
  useEffect(() => {
    const tick = setInterval(() => setSecondsSince(s => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  // Manual refresh: fire immediately and reset the 5-second interval
  const handleRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    fetchProgress()
    intervalRef.current = setInterval(fetchProgress, 5000)
  }, [fetchProgress])

  const handleDelete = async (testerId: string) => {
    const result = await deleteTester(slug, testerId)
    if (!result.error) {
      setTesters((prev) => prev.filter((t) => t.id !== testerId))
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (testers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No testers have registered yet</p>
        <p className="text-xs text-gray-400 mt-1">Share the tester link to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header row: tester count + status + refresh button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {testers.length} Tester{testers.length !== 1 ? "s" : ""}
          </span>
          {fetchError ? (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Unable to refresh — showing last known data
            </span>
          ) : lastUpdated ? (
            <span className="text-xs text-gray-400">
              Updated {secondsSince < 5 ? "just now" : `${secondsSince}s ago`}
            </span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-7 text-xs gap-1 text-gray-600 hover:text-emerald-700 hover:border-emerald-300"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tester</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-48">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pass</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">N/A</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Up For Review</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testers.map((tester) => {
                const pct = totalItems > 0
                  ? Math.round((tester.completed / totalItems) * 100)
                  : 0
                return (
                  <tr key={tester.id} className="group border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm text-gray-800">{tester.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tester.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tester.pass > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">{tester.pass}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tester.fail > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">{tester.fail}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tester.na > 0 && (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">{tester.na}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tester.blocked > 0 && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{tester.blocked}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/test/${slug}/checklist?tester=${tester.id}`} target="_blank">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Tester</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {tester.name} and all their responses.
                                  This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(tester.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
