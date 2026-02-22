"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState } from "react-dom"
import { useRouter } from "next/navigation"
import { registerTester, type RegisterTesterState } from "@/lib/actions/testers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { ClipboardCheck } from "lucide-react"

const initialState: RegisterTesterState = {}

export default function RegistrationForm({
  projectId,
  slug,
  companyName,
}: {
  projectId: string
  slug: string
  companyName?: string
}) {
  const [state, formAction] = useFormState(registerTester, initialState)
  const router = useRouter()
  const [phone, setPhone] = useState("63")
  const [clientErrors, setClientErrors] = useState<{ name?: string; email?: string; mobile?: string }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.success && state.testerId) {
      router.push(`/test/${slug}/checklist?tester=${state.testerId}`)
    }
  }, [state, router, slug])

  return (
    <div className="space-y-6">
      {/* Branding header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck className="h-6 w-6 text-emerald-700" />
        </div>
        {companyName && (
          <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
        )}
        <p className="text-sm text-gray-500 mt-1">UAT Checklist Registration</p>
      </div>

      <form
        action={formAction}
        className="space-y-4"
        onSubmit={(e) => {
          const errors: typeof clientErrors = {}
          if (!nameRef.current?.value.trim()) errors.name = "Full name is required"
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRef.current?.value || "")) errors.email = "Enter a valid email"
          if (phone.length <= 4) errors.mobile = "Mobile number is required"
          if (Object.keys(errors).length > 0) {
            e.preventDefault()
            setClientErrors(errors)
            if (errors.name) nameRef.current?.focus()
            else if (errors.email) emailRef.current?.focus()
          } else {
            setClientErrors({})
          }
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="mobile" value={phone ? `+${phone}` : ""} />

        {state.returning && state.testerName && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
            Welcome back, {state.testerName}! Redirecting to your checklist...
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-gray-500">
            Full Name<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="John Smith"
            required
            className="h-10"
            ref={nameRef}
            onBlur={(e) => {
              if (!e.target.value.trim()) {
                setClientErrors((prev) => ({ ...prev, name: "Full name is required" }))
              } else {
                setClientErrors((prev) => ({ ...prev, name: undefined }))
              }
            }}
          />
          {clientErrors.name && <p className="text-red-500 text-xs mt-1">{clientErrors.name}</p>}
          {state.fieldErrors?.name && (
            <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-gray-500">
            Email<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@example.com"
            required
            className="h-10"
            ref={emailRef}
            onBlur={(e) => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                setClientErrors((prev) => ({ ...prev, email: "Enter a valid email" }))
              } else {
                setClientErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
          />
          {clientErrors.email && <p className="text-red-500 text-xs mt-1">{clientErrors.email}</p>}
          {state.fieldErrors?.email && (
            <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">
            Mobile Number<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <PhoneInput
            country="ph"
            value={phone}
            onChange={(value) => {
              setPhone(value)
              if (value.length > 4) {
                setClientErrors((prev) => ({ ...prev, mobile: undefined }))
              }
            }}
            onBlur={() => {
              if (phone.length <= 4) {
                setClientErrors((prev) => ({ ...prev, mobile: "Mobile number is required" }))
              }
            }}
            inputProps={{ required: true }}
            containerStyle={{ width: "100%" }}
            inputStyle={{ width: "100%", height: "40px", fontSize: "14px" }}
          />
          {clientErrors.mobile && <p className="text-red-500 text-xs mt-1">{clientErrors.mobile}</p>}
          {state.fieldErrors?.mobile && (
            <p className="text-sm text-red-600">{state.fieldErrors.mobile[0]}</p>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10">
          Start Checklist
        </Button>
      </form>
    </div>
  )
}
