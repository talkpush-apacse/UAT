"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { CircleHelp } from "lucide-react"

const STORAGE_KEY = "whats-new:lastSeenVersion"
const WHATS_NEW_PATH = "/admin/whats-new"

export function WhatsNewNavLink({ latestVersion }: { latestVersion: string }) {
  const pathname = usePathname()
  const [hasUnseen, setHasUnseen] = useState(false)

  useEffect(() => {
    if (pathname === WHATS_NEW_PATH) {
      window.localStorage.setItem(STORAGE_KEY, latestVersion)
      setHasUnseen(false)
      return
    }

    const lastSeen = window.localStorage.getItem(STORAGE_KEY)
    setHasUnseen(lastSeen !== latestVersion)
  }, [pathname, latestVersion])

  return (
    <Link
      href={WHATS_NEW_PATH}
      className="relative inline-flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
    >
      <CircleHelp className="h-4 w-4 mr-1.5" />
      Help
      {hasUnseen && (
        <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-brand-pink-darker" />
      )}
    </Link>
  )
}
