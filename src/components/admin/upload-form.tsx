"use client"

import { useEffect, useRef } from "react"
import { useFormState } from "react-dom"
import { useRouter } from "next/navigation"
import { importChecklist, type ChecklistActionState } from "@/lib/actions/checklist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
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
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react"

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
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push(`/admin/projects/${slug}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state.success, router, slug])

  return (
    <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-700" />
          <CardTitle className="text-base font-semibold text-gray-900">Upload Checklist</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Upload an XLSX or CSV file with your test steps. Expected columns:
          Step Number, Path, Actor, Action, View Sample, CRM Module, Tip
        </p>
      </CardHeader>
      <CardContent className="p-5">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file" className="text-xs text-gray-500">Checklist File</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-200">
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">Drop your file here or click to browse</p>
              <p className="text-xs text-gray-400 mb-3">XLSX or CSV format</p>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".xlsx,.csv"
                required
                className="max-w-xs mx-auto"
              />
            </div>
          </div>
          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          {state.errors && state.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <p className="font-medium text-amber-800 mb-1">Parsing warnings:</p>
              <ul className="list-disc list-inside text-amber-700 space-y-1">
                {state.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {state.success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Successfully imported {state.itemCount} checklist items. Redirecting...
            </div>
          )}
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              This will permanently replace all existing checklist steps for this project.
            </AlertDescription>
          </Alert>
          <Separator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button">Upload &amp; Import</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace Checklist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently replace all existing checklist steps. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
                  Yes, Replace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </CardContent>
    </Card>
  )
}
