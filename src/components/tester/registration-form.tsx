"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registerTester, lookupTesterByEmail, type RegisterTesterState } from "@/lib/actions/testers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { Eye, Loader2 } from "lucide-react"
import { getCountryByCode, DEFAULT_COUNTRY_CODE } from "@/lib/countries"
import { ClientLogosHeader } from "./client-logos-header"
import { trackEvent } from "@/lib/mixpanel"

const initialState: RegisterTesterState = {}

export default function RegistrationForm({
  projectId,
  slug,
  companyName,
  country,
  clientLogoUrl,
}: {
  projectId: string
  slug: string
  companyName?: string
  country?: string | null
  clientLogoUrl?: string | null
}) {
  const [state, formAction] = useFormState(registerTester, initialState)
  const router = useRouter()
  const resolvedCountry = getCountryByCode(country || DEFAULT_COUNTRY_CODE)
  const [phone, setPhone] = useState(resolvedCountry.dialCode)
  const [clientErrors, setClientErrors] = useState<{ name?: string; email?: string; mobile?: string }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneWrapperRef = useRef<HTMLDivElement>(null)

  // Email-first: returning testers only need their email; new testers then
  // add name + mobile.
  const [step, setStep] = useState<"email" | "details">("email")
  const [email, setEmail] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [welcomeName, setWelcomeName] = useState<string | null>(null)

  useEffect(() => {
    if (state.success && state.testerId) {
      router.push(`/test/${slug}/checklist?tester=${state.testerId}`)
    }
  }, [state, router, slug])

  // Server-side rejections. Field *names* and a reason only — never the
  // values typed or the server's message text.
  useEffect(() => {
    if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      trackEvent("Registration Failed", {
        project_slug: slug,
        reason: "server_check",
        fields: Object.keys(state.fieldErrors),
      })
    } else if (state.error) {
      trackEvent("Registration Failed", {
        project_slug: slug,
        reason: /already exists/i.test(state.error) ? "already_registered" : "server_error",
        fields: [],
      })
    }
  }, [state, slug])

  useEffect(() => {
    if (step === "details") nameRef.current?.focus()
    // The phone library's country picker has no accessible name of its own.
    phoneWrapperRef.current
      ?.querySelector(".selected-flag")
      ?.setAttribute("aria-label", "Change country code")
  }, [step])

  const handleEmailContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = (emailRef.current?.value || "").trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setClientErrors({ email: "Enter a valid email" })
      trackEvent("Registration Failed", { project_slug: slug, reason: "form_check", fields: ["email"] })
      emailRef.current?.focus()
      return
    }
    setClientErrors({})
    setLookupError(null)
    setIsLookingUp(true)
    const result = await lookupTesterByEmail(projectId, value)
    if (result.error) {
      trackEvent("Registration Failed", { project_slug: slug, reason: "server_error", fields: [] })
      setLookupError(result.error)
      setIsLookingUp(false)
      return
    }
    setEmail(value)
    if (result.found && result.testerId) {
      setWelcomeName(result.testerName ?? "")
      router.push(`/test/${slug}/checklist?tester=${result.testerId}`)
      return
    }
    setIsLookingUp(false)
    setStep("details")
  }

  const previewButton = (
    <Button asChild type="button" variant="outline" className="w-full h-10">
      <Link href={`/test/${slug}/preview`}>
        <Eye className="h-4 w-4" />
        Preview UAT Steps
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      {/* Branding header */}
      <div className="text-center">
        <ClientLogosHeader
          clientLogoUrl={clientLogoUrl}
          className="justify-center mb-3"
          logoClassName="h-7"
        />
        {companyName && (
          <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
        )}
        <p className="text-sm text-gray-500 mt-1">User Acceptance Testing</p>
      </div>

      {step === "email" && (
        <form onSubmit={handleEmailContinue} className="space-y-4" noValidate>
          {welcomeName !== null ? (
            <div className="p-3 bg-brand-sage-lightest border border-brand-sage-lighter rounded-lg text-sm text-brand-sage-darker">
              Welcome back{welcomeName ? `, ${welcomeName}` : ""}! Taking you to your UAT steps…
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center">
              Enter your email to start — or to continue where you left off.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="lookup-email" className="text-xs text-gray-500">
              Email<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              id="lookup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="john@example.com"
              required
              className="h-10"
              ref={emailRef}
              defaultValue={email}
              disabled={isLookingUp}
            />
            {clientErrors.email && <p className="text-red-500 text-xs mt-1">{clientErrors.email}</p>}
            {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
          </div>
          <Button type="submit" className="w-full h-10" disabled={isLookingUp}>
            {isLookingUp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              "Continue"
            )}
          </Button>
          {previewButton}
        </form>
      )}

      {step === "details" && (
      <form
        action={formAction}
        className="space-y-4"
        onSubmit={(e) => {
          const errors: typeof clientErrors = {}
          if (!nameRef.current?.value.trim()) errors.name = "Full name is required"
          if (phone.length <= 4) errors.mobile = "Mobile number is required"
          if (Object.keys(errors).length > 0) {
            e.preventDefault()
            setClientErrors(errors)
            trackEvent("Registration Failed", {
              project_slug: slug,
              reason: "form_check",
              fields: Object.keys(errors),
            })
            if (errors.name) nameRef.current?.focus()
          } else {
            setClientErrors({})
          }
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="email" value={email} />

        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
          <span className="min-w-0 truncate text-gray-700">{email}</span>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="flex-shrink-0 text-xs font-medium text-brand-sage-darker underline underline-offset-2 hover:text-primary"
          >
            Change
          </button>
        </div>
        <p className="text-sm text-gray-600">New here — add your name and mobile to start.</p>
        <input type="hidden" name="mobile" value={phone ? `+${phone}` : ""} />

        {state.returning && state.testerName && (
          <div className="p-3 bg-brand-sage-lightest border border-brand-sage-lighter rounded-lg text-sm text-brand-sage-darker">
            Welcome back, {state.testerName}! Redirecting to your UAT steps...
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

        {state.fieldErrors?.email && (
          <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">
            Mobile Number<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <div ref={phoneWrapperRef}>
          <PhoneInput
            country={resolvedCountry.code.toLowerCase()}
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
            enableSearch
            searchPlaceholder="Search country"
          />
          </div>
          <p className="text-xs text-gray-400">Wrong country code? Tap the flag to change it.</p>
          {clientErrors.mobile && <p className="text-red-500 text-xs mt-1">{clientErrors.mobile}</p>}
          {state.fieldErrors?.mobile && (
            <p className="text-sm text-red-600">{state.fieldErrors.mobile[0]}</p>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10">
          Start Testing
        </Button>
        {previewButton}
      </form>
      )}
    </div>
  )
}
