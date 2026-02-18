import Link from "next/link"
import { logoutAdmin } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-emerald-800 to-emerald-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <Link href="/admin" className="font-semibold text-lg text-gray-900 hover:text-emerald-700 transition-colors">
                UAT Admin
              </Link>
            </div>
            <form action={logoutAdmin}>
              <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
