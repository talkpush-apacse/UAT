"use client"

import { useState, useTransition } from "react"
import { updateProjectNotificationRecipients } from "@/lib/actions/notifications"
import {
  MAX_NOTIFICATION_RECIPIENTS,
  notificationEmailSchema,
} from "@/lib/schemas/notification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, X } from "lucide-react"

interface Props {
  projectId: string
  slug: string
  initialEmails: string[]
}

export default function NotificationRecipientsCard({ projectId, slug, initialEmails }: Props) {
  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [draft, setDraft] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Returns the new list on success so Save can include a half-typed address.
  function addDraft(): string[] | null {
    const value = draft.trim()
    if (!value) return emails
    const parsed = notificationEmailSchema.safeParse(value)
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email address")
      return null
    }
    if (emails.includes(parsed.data)) {
      setFieldError("That person is already on the list")
      return null
    }
    if (emails.length >= MAX_NOTIFICATION_RECIPIENTS) {
      setFieldError(`You can notify up to ${MAX_NOTIFICATION_RECIPIENTS} people`)
      return null
    }
    const next = [...emails, parsed.data]
    setEmails(next)
    setDraft("")
    setFieldError(null)
    setSaved(false)
    return next
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email))
    setSaved(false)
    setSaveError(null)
  }

  function handleSave() {
    const next = addDraft()
    if (!next) return
    setSaveError(null)
    startTransition(async () => {
      const result = await updateProjectNotificationRecipients(projectId, slug, next)
      if (result.error) {
        setSaveError(result.error)
        setSaved(false)
        return
      }
      setEmails(result.emails ?? next)
      setSaved(true)
    })
  }

  return (
    <Card className="bg-white rounded-xl border border-gray-100 shadow-sm mt-6">
      <CardHeader className="px-5 py-4 bg-gray-50/50 rounded-t-xl border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-sage-darker" />
          <CardTitle className="text-base font-semibold text-gray-900">Submission notifications</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="notificationEmail" className="text-xs text-gray-500">Add a Talkpush email</Label>
          <div className="flex gap-2">
            <Input
              id="notificationEmail"
              type="email"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setFieldError(null)
                setSaved(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addDraft()
                }
              }}
              placeholder="name@talkpush.com"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby="notificationHelp notificationError"
            />
            <Button type="button" variant="outline" onClick={() => addDraft()}>
              Add
            </Button>
          </div>
          <p id="notificationHelp" className="text-xs text-gray-500">
            These people get an email each time a tester submits.
          </p>
          <p id="notificationError" role="alert" className="text-sm text-red-600">
            {fieldError}
          </p>
        </div>

        {emails.length === 0 ? (
          <p className="text-sm text-gray-500">No one is notified yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {emails.map((email) => (
              <li
                key={email}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1.5 text-sm text-gray-900"
              >
                <span className="break-all">{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Remove ${email}`}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage-darker"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {saveError && (
          <p role="alert" className="text-sm text-red-600">{saveError}</p>
        )}
        <div className="flex items-center justify-end gap-3">
          {saved && <p role="status" className="text-sm text-green-700">Saved</p>}
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Recipients"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
