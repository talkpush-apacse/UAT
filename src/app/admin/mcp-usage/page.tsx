import { redirect } from "next/navigation"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { McpUsageChart } from "@/components/admin/mcp-usage-chart"

export default async function McpUsagePage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  return (
    <div>
      <h1 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">
        MCP Usage
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Tool-call volume for the /api/mcp server, by tool name.
      </p>
      <McpUsageChart />
    </div>
  )
}
