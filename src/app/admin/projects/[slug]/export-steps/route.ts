import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import ExcelJS from "exceljs"

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, company_name, title")
    .eq("slug", params.slug)
    .single()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { data: checklistItems, error } = await supabase
    .from("checklist_items")
    .select("step_number, path, actor, action, crm_module, tip, view_sample")
    .eq("project_id", project.id)
    .order("sort_order")

  if (error) {
    console.error("Failed to fetch checklist items:", error.message)
    return NextResponse.json(
      { error: "Failed to fetch checklist items" },
      { status: 500 }
    )
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Checklist Steps")

  sheet.columns = [
    { header: "Step #", key: "stepNumber", width: 10 },
    { header: "Path", key: "path", width: 14 },
    { header: "Actor", key: "actor", width: 14 },
    { header: "Action", key: "action", width: 55 },
    { header: "CRM Module", key: "crmModule", width: 20 },
    { header: "Tip", key: "tip", width: 40 },
    { header: "View Sample", key: "viewSample", width: 30 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const item of checklistItems || []) {
    sheet.addRow({
      stepNumber: item.step_number,
      path: item.path || "",
      actor: item.actor,
      action: item.action,
      crmModule: item.crm_module || "",
      tip: item.tip || "",
      viewSample: item.view_sample || "",
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${params.slug}-steps.xlsx"`,
    },
  })
}
