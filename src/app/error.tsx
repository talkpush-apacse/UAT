"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  )
}
