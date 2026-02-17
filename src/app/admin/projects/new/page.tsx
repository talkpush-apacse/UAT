"use client"

import { useFormState } from "react-dom"
import { createProject, type ProjectActionState } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"

const initialState: ProjectActionState = {}

export default function NewProjectPage() {
  const [state, formAction] = useFormState(createProject, initialState)

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Projects
      </Link>

      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold text-gray-900">Create New Project</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs text-gray-500">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="e.g. Acme Corp"
                required
              />
              {state.fieldErrors?.companyName && (
                <p className="text-sm text-red-600">{state.fieldErrors.companyName[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs text-gray-500">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="e.g. acme-corp-q1"
                required
              />
              <p className="text-xs text-gray-400">
                Lowercase, alphanumeric with hyphens. This will be the tester link: /test/your-slug
              </p>
              {state.fieldErrors?.slug && (
                <p className="text-sm text-red-600">{state.fieldErrors.slug[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testScenario" className="text-xs text-gray-500">Test Scenario (optional)</Label>
              <Textarea
                id="testScenario"
                name="testScenario"
                placeholder="Describe what this UAT is testing..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="talkpushLoginLink" className="text-xs text-gray-500">Talkpush Login Link (optional)</Label>
              <Input
                id="talkpushLoginLink"
                name="talkpushLoginLink"
                type="url"
                placeholder="e.g. https://app.talkpush.com/login/acme-corp"
              />
              <p className="text-xs text-gray-400">
                This link will be shown to testers on the first step that involves Talkpush.
              </p>
              {state.fieldErrors?.talkpushLoginLink && (
                <p className="text-sm text-red-600">{state.fieldErrors.talkpushLoginLink[0]}</p>
              )}
            </div>
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <Separator />
            <div className="flex items-center justify-end gap-2">
              <Link href="/admin">
                <Button variant="outline" type="button" className="text-gray-500">Cancel</Button>
              </Link>
              <Button type="submit">
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
