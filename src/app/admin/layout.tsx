import Link from "next/link"
import { logoutAdmin } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { AboutDialog } from "@/components/about/AboutDialog"
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs"
import { UatCheckboxFavicon } from "@/components/brand/UatCheckboxFavicon"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Talkpush Sign brand gradient strip */}
      <div className="h-1.5 brand-gradient-strip" />
      <nav className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center gap-4">
            {/* Left: logo + dynamic breadcrumb trail */}
            <div className="flex items-center gap-2 min-w-0">
              <UatCheckboxFavicon className="h-8 w-8 flex-shrink-0" />
              <Link
                href="/admin"
                className="font-nav font-semibold text-base text-foreground hover:text-brand-sage-darker transition-colors flex-shrink-0"
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
