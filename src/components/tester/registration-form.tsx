"use client"

import { useEffect } from "react"
import { useFormState } from "react-dom"
import { useRouter } from "next/navigation"
import { registerTester, type RegisterTesterState } from "@/lib/actions/testers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: RegisterTesterState = {}

export default function RegistrationForm({
  projectId,
  slug,
}: {
  projectId: string
  slug: string
}) {
  const [state, formAction] = useFormState(registerTester, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success && state.testerId) {
      router.push(`/test/${slug}/checklist?tester=${state.testerId}`)
    }
  }, [state, router, slug])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      {state.returning && state.testerName && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          Welcome back, {state.testerName}! Redirecting to your checklist...
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" placeholder="John Smith" required />
        {state.fieldErrors?.name && (
          <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="john@example.com" required />
        {state.fieldErrors?.email && (
          <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number</Label>
        <Input id="mobile" name="mobile" type="tel" placeholder="+1 234 567 8900" required />
        {state.fieldErrors?.mobile && (
          <p className="text-sm text-red-600">{state.fieldErrors.mobile[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" className="w-full">
        Start Checklist
      </Button>
    </form>
  )
}
