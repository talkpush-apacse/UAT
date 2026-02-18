"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState } from "react-dom"
import { useRouter } from "next/navigation"
import { registerTester, type RegisterTesterState } from "@/lib/actions/testers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClipboardCheck } from "lucide-react"

const COUNTRY_CODES = [
  { code: "+63", country: "PH", label: "PH +63" },
  { code: "+1", country: "US", label: "US +1" },
  { code: "+44", country: "GB", label: "GB +44" },
  { code: "+61", country: "AU", label: "AU +61" },
  { code: "+91", country: "IN", label: "IN +91" },
  { code: "+65", country: "SG", label: "SG +65" },
  { code: "+852", country: "HK", label: "HK +852" },
  { code: "+81", country: "JP", label: "JP +81" },
  { code: "+82", country: "KR", label: "KR +82" },
  { code: "+86", country: "CN", label: "CN +86" },
  { code: "+60", country: "MY", label: "MY +60" },
  { code: "+66", country: "TH", label: "TH +66" },
  { code: "+62", country: "ID", label: "ID +62" },
  { code: "+84", country: "VN", label: "VN +84" },
  { code: "+971", country: "AE", label: "AE +971" },
  { code: "+966", country: "SA", label: "SA +966" },
  { code: "+33", country: "FR", label: "FR +33" },
  { code: "+49", country: "DE", label: "DE +49" },
  { code: "+55", country: "BR", label: "BR +55" },
  { code: "+52", country: "MX", label: "MX +52" },
]

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
  const [countryCode, setCountryCode] = useState("+63")
  const [phoneNumber, setPhoneNumber] = useState("")
  const mobileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.success && state.testerId) {
      router.push(`/test/${slug}/checklist?tester=${state.testerId}`)
    }
  }, [state, router, slug])

  // Keep the hidden input in sync
  useEffect(() => {
    if (mobileRef.current) {
      mobileRef.current.value = phoneNumber ? `${countryCode}${phoneNumber}` : ""
    }
  }, [countryCode, phoneNumber])

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

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="mobile" ref={mobileRef} />

        {state.returning && state.testerName && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
            Welcome back, {state.testerName}! Redirecting to your checklist...
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-gray-500">Full Name</Label>
          <Input id="name" name="name" placeholder="John Smith" required className="h-10" />
          {state.fieldErrors?.name && (
            <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-gray-500">Email</Label>
          <Input id="email" name="email" type="email" placeholder="john@example.com" required className="h-10" />
          {state.fieldErrors?.email && (
            <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Mobile Number</Label>
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-[120px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              placeholder="912 345 6789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 h-10"
              required
            />
          </div>
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
