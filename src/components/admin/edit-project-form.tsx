"use client"

import { useFormState } from "react-dom"
import { updateProject, type ProjectActionState } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Pencil } from "lucide-react"

interface Project {
  id: string
  slug: string
  company_name: string
  test_scenario: string | null
  talkpush_login_link: string | null
}

export default function EditProjectForm({ project }: { project: Project }) {
  const boundAction = updateProject.bind(null, project.id, project.slug)
  const [state, formAction] = useFormState<ProjectActionState, FormData>(
    boundAction,
    {}
  )

  return (
    <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-base font-semibold text-gray-900">Edit Project</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-xs text-gray-500">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={project.company_name}
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
              defaultValue={project.slug}
              required
            />
            {state.fieldErrors?.slug && (
              <p className="text-sm text-red-600">{state.fieldErrors.slug[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="testScenario" className="text-xs text-gray-500">Test Scenario</Label>
            <Textarea
              id="testScenario"
              name="testScenario"
              defaultValue={project.test_scenario || ""}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="talkpushLoginLink" className="text-xs text-gray-500">Talkpush Login Link</Label>
            <Input
              id="talkpushLoginLink"
              name="talkpushLoginLink"
              type="url"
              defaultValue={project.talkpush_login_link || ""}
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
          <div className="flex items-center justify-end">
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
