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
import { Users, ExternalLink, Trash2 } from "lucide-react"

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
  const testersRef = useRef(testers)
  testersRef.current = testers

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/progress`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const newTesters = data.testers || []
        if (newTesters.length > 0 || testersRef.current.length === 0) {
          setTesters(newTesters)
        }
      }
    } catch {
      // Silently ignore fetch errors during polling — keep existing data
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (!initialTesters || initialTesters.length === 0) {
      fetchProgress()
    }
    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [fetchProgress, initialTesters])

  const handleDelete = async (testerId: string) => {
    const result = await deleteTester(slug, testerId)
    if (!result.error) {
      setTesters((prev) => prev.filter((t) => t.id !== testerId))
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading tester progress...</p>
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
      <p className="text-xs text-gray-400 mb-3">Auto-refreshes every 5 seconds</p>
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
