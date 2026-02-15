"use client"

import { useState, useEffect, useCallback } from "react"
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

interface TesterProgress {
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
}: {
  slug: string
  totalItems: number
}) {
  const [testers, setTesters] = useState<TesterProgress[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/progress`)
      if (res.ok) {
        const data = await res.json()
        setTesters(data.testers || [])
      }
    } catch {
      // Silently ignore fetch errors during polling
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchProgress()
    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [fetchProgress])

  const handleDelete = async (testerId: string) => {
    const result = await deleteTester(slug, testerId)
    if (!result.error) {
      setTesters((prev) => prev.filter((t) => t.id !== testerId))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tester progress...</p>
  }

  if (testers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No testers have registered yet. Share the tester link to get started.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-3">Auto-refreshes every 5 seconds</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-lg">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">Tester</th>
              <th className="text-left p-2 font-medium">Email</th>
              <th className="text-left p-2 font-medium w-48">Progress</th>
              <th className="text-left p-2 font-medium">Pass</th>
              <th className="text-left p-2 font-medium">Fail</th>
              <th className="text-left p-2 font-medium">N/A</th>
              <th className="text-left p-2 font-medium">Blocked</th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {testers.map((tester) => {
              const pct = totalItems > 0
                ? Math.round((tester.completed / totalItems) * 100)
                : 0
              return (
                <tr key={tester.id} className="border-t">
                  <td className="p-2 font-medium">{tester.name}</td>
                  <td className="p-2 text-muted-foreground">{tester.email}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs whitespace-nowrap">{pct}%</span>
                    </div>
                  </td>
                  <td className="p-2">
                    {tester.pass > 0 && <Badge className="bg-green-600">{tester.pass}</Badge>}
                  </td>
                  <td className="p-2">
                    {tester.fail > 0 && <Badge variant="destructive">{tester.fail}</Badge>}
                  </td>
                  <td className="p-2">
                    {tester.na > 0 && <Badge variant="secondary">{tester.na}</Badge>}
                  </td>
                  <td className="p-2">
                    {tester.blocked > 0 && <Badge variant="outline">{tester.blocked}</Badge>}
                  </td>
                  <td className="p-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 h-7 px-2">
                          Delete
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
