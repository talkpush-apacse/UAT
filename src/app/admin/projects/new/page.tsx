"use client"

import { useState, useEffect } from "react"
import { useFormState } from "react-dom"
import { createProject, type ProjectActionState } from "@/lib/actions/projects"
import { slugifyProjectTitle } from "@/lib/utils/project-slug"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"

const initialState: ProjectActionState = {}

export default function NewProjectPage() {
  const [state, formAction] = useFormState(createProject, initialState)
  const [companyName, setCompanyName] = useState("")
  const [clientNames, setClientNames] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) =>
        setClientNames(data.map((c) => c.name))
      )
      .catch(() => {})
  }, [])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugEdited) {
      setSlug(value ? slugifyProjectTitle(value) : "")
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugEdited(true)
    setSlug(value ? slugifyProjectTitle(value) : "")
  }

  const previewSlug = slug || (title ? slugifyProjectTitle(title) : "uat-checklist")

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-sage-darker transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to UAT Checklists
      </Link>

      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-sage-darker" />
            <CardTitle className="text-base font-semibold text-gray-900">Create New UAT Checklist</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs text-gray-500">Client Name *</Label>
              {/* Hidden input to submit the select value with the form */}
              <input type="hidden" name="companyName" value={companyName} />
              <Select value={companyName} onValueChange={setCompanyName}>
                <SelectTrigger className="border border-gray-300 bg-white focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.companyName && (
                <p className="text-sm text-red-600">{state.fieldErrors.companyName[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs text-gray-500">UAT Checklist Title *</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Q1 2026 CRM Migration UAT"
                required
              />
              {state.fieldErrors?.title && (
                <p className="text-sm text-red-600">{state.fieldErrors.title[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs text-gray-500">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={title ? slugifyProjectTitle(title) : "uat-checklist"}
              />
              <p className="text-xs text-gray-400">
                Lowercase, alphanumeric with hyphens. Tester link preview:{" "}
                <span className="font-mono text-gray-500">/test/{previewSlug}</span>
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
                Create UAT Checklist
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
