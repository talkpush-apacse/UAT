import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-sage-lightest flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="h-7 w-7 text-brand-sage-darker" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-sm text-gray-500 mb-6">Page not found</p>
        <Link href="/admin">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
