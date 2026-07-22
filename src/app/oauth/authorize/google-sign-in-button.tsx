"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function GoogleSignInButton({ returnUrl }: { returnUrl: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      },
    })

    if (error) {
      console.error("Google sign-in failed:", error.message)
      setError("Unable to start Google sign-in")
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-10"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting..." : "Sign in with Google"}
      </Button>
      <p className="mt-2 text-center text-xs text-gray-500">
        Available for @talkpush.com accounts
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  )
}
