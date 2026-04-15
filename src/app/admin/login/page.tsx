"use client"

import { useEffect, useState } from "react"
import { useFormState } from "react-dom"
import { loginAdmin, type AuthState } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { LayoutDashboard } from "lucide-react"

const initialState: AuthState = {}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAdmin, initialState)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsUnauthorized(params.get("error") === "unauthorized")
  }, [])

  async function handleGoogleSignIn() {
    setGoogleError(null)
    setIsGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error("Google sign-in failed:", error.message)
      setGoogleError("Unable to start Google sign-in")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">UAT Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your projects</p>
        </div>

        {isUnauthorized && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Access restricted to @talkpush.com accounts
          </p>
        )}

        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-gray-500">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter admin password"
                  required
                  autoFocus
                  className="h-10"
                />
              </div>
              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              <Button type="submit" className="w-full h-10">
                Sign In
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? "Redirecting..." : "Sign in with Google"}
            </Button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Available for @talkpush.com accounts
            </p>
            {googleError && (
              <p className="mt-3 text-sm text-red-600">{googleError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
