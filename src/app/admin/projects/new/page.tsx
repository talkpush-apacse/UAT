"use client"

import { useFormState } from "react-dom"
import { createProject, type ProjectActionState } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const initialState: ProjectActionState = {}

export default function NewProjectPage() {
  const [state, formAction] = useFormState(createProject, initialState)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Projects
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
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
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="e.g. acme-corp-q1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, alphanumeric with hyphens. This will be the tester link: /test/your-slug
              </p>
              {state.fieldErrors?.slug && (
                <p className="text-sm text-red-600">{state.fieldErrors.slug[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="testScenario">Test Scenario (optional)</Label>
              <Textarea
                id="testScenario"
                name="testScenario"
                placeholder="Describe what this UAT is testing..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="talkpushLoginLink">Talkpush Login Link (optional)</Label>
              <Input
                id="talkpushLoginLink"
                name="talkpushLoginLink"
                type="url"
                placeholder="e.g. https://app.talkpush.com/login/acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                This link will be shown to testers on the first step that involves Talkpush.
              </p>
              {state.fieldErrors?.talkpushLoginLink && (
                <p className="text-sm text-red-600">{state.fieldErrors.talkpushLoginLink[0]}</p>
              )}
            </div>
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit">
                Create Project
              </Button>
              <Link href="/admin">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
