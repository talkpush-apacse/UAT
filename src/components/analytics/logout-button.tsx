"use client"

import { logoutAdmin } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { resetMixpanel } from "@/lib/mixpanel"

// Resets the Mixpanel session before the logout server action runs — without
// this, the next admin to log in on the same browser (a shared office
// machine, or this app's own shared password login) would get merged into
// whoever was previously identified here.
export function LogoutButton() {
  return (
    <form action={logoutAdmin} onSubmit={() => resetMixpanel()}>
      <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-gray-700">
        <LogOut className="h-4 w-4 mr-1.5" />
        Logout
      </Button>
    </form>
  )
}
