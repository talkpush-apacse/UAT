import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { generateShareToken } from "@/lib/utils/share-token"

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = await generateShareToken(params.slug)
  return Response.json({ token })
}
