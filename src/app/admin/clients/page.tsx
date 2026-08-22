export const dynamic = "force-dynamic"

import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import ClientsManager from "@/components/admin/clients-manager"

export default async function ClientsPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect("/admin/login")

  const supabase = createAdminClient()
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, logo_url, created_at")
    .order("name")

  if (error) {
    throw new Error("Failed to load clients")
  }

  // Get project counts per client
  const { data: projects } = await supabase
    .from("projects")
    .select("client_id")

  const projectCountByClient = new Map<string, number>()
  for (const p of projects ?? []) {
    if (!p.client_id) continue
    projectCountByClient.set(
      p.client_id,
      (projectCountByClient.get(p.client_id) ?? 0) + 1
    )
  }

  const clientsWithCounts = (clients ?? []).map((c) => ({
    ...c,
    projectCount: projectCountByClient.get(c.id) ?? 0,
  }))

  return <ClientsManager clients={clientsWithCounts} />
}
