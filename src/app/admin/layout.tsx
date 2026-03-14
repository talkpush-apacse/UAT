import Link from "next/link"
import { logoutAdmin } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard } from "lucide-react"
import { AboutDialog } from "@/components/about/AboutDialog"
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center gap-4">
            {/* Left: logo + dynamic breadcrumb trail */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <Link
                href="/admin"
                className="font-semibold text-base text-gray-900 hover:text-brand-sage-darker transition-colors flex-shrink-0"
              >
                UAT Admin
              </Link>
              {/* Client component: shows > [slug] > Section for sub-pages */}
              <AdminBreadcrumbs />
            </div>

            {/* Right: Help + Logout */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <AboutDialog />
              <form action={logoutAdmin}>
                <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-gray-700">
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
