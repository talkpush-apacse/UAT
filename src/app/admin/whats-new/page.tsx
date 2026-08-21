import { redirect } from "next/navigation"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { WhatsNewTimeline, type ChangelogEntry } from "@/components/about/WhatsNewTimeline"
import changelog from "../../../../CHANGELOG.json"

export default async function WhatsNewPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">
        What&apos;s New
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        A timeline of features and improvements shipped to the UAT Web Interface.
      </p>
      <WhatsNewTimeline entries={changelog as ChangelogEntry[]} />
    </div>
  )
}
