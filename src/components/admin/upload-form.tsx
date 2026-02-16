"use client"

import { useEffect } from "react"
import { useFormState } from "react-dom"
import { useRouter } from "next/navigation"
import { importChecklist, type ChecklistActionState } from "@/lib/actions/checklist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UploadForm({
  projectId,
  slug,
}: {
  projectId: string
  slug: string
}) {
  const boundAction = importChecklist.bind(null, projectId, slug)
  const [state, formAction] = useFormState<ChecklistActionState, FormData>(
    boundAction,
    {}
  )
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push(`/admin/projects/${slug}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state.success, router, slug])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Checklist</CardTitle>
        <CardDescription>
          Upload an XLSX or CSV file with your test steps. Expected columns:
          Step Number, Path (Happy/Non-Happy), Actor (Candidate/Talkpush/Recruiter),
          Action, View Sample, CRM Module, Tip (optional)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Checklist File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.csv"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will replace any existing checklist items for this project.
            </p>
          </div>
          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          {state.errors && state.errors.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium text-yellow-800 mb-1">Parsing warnings:</p>
              <ul className="list-disc list-inside text-yellow-700 space-y-1">
                {state.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {state.success && (
            <p className="text-sm text-green-600">
              Successfully imported {state.itemCount} checklist items. Redirecting...
            </p>
          )}
          <Button type="submit">
            Upload & Import
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
