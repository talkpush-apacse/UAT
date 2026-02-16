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
    .select("*")
    .eq("slug", params.slug)
    .single()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order")

  const { data: testers } = await supabase
    .from("testers")
    .select("*")
    .eq("project_id", project.id)

  const { data: signoffs } = await supabase
    .from("signoffs")
    .select("*")
    .eq("project_id", project.id)
    .order("signoff_date")

  const testerIds = (testers || []).map((t) => t.id)
  let responses: Array<{
    tester_id: string
    checklist_item_id: string
    status: string | null
    comment: string | null
  }> = []

  if (testerIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status, comment")
      .in("tester_id", testerIds)

    responses = data || []
  }

  // Build workbook
  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary")
  summarySheet.columns = [
    { header: "Field", key: "field", width: 25 },
    { header: "Value", key: "value", width: 50 },
  ]
  summarySheet.addRow({ field: "Company", value: project.company_name })
  summarySheet.addRow({ field: "Slug", value: project.slug })
  summarySheet.addRow({ field: "Test Scenario", value: project.test_scenario || "" })
  summarySheet.addRow({ field: "Total Steps", value: checklistItems?.length || 0 })
  summarySheet.addRow({ field: "Total Testers", value: testers?.length || 0 })
  summarySheet.addRow({ field: "Created", value: new Date(project.created_at).toLocaleString() })

  // Bold the header row
  summarySheet.getRow(1).font = { bold: true }

  // Sheet 2: Detailed Results
  const detailSheet = workbook.addWorksheet("Detailed Results")
  detailSheet.columns = [
    { header: "Tester Name", key: "testerName", width: 20 },
    { header: "Tester Email", key: "testerEmail", width: 25 },
    { header: "Step #", key: "step", width: 8 },
    { header: "Path", key: "path", width: 12 },
    { header: "Actor", key: "actor", width: 12 },
    { header: "CRM Module", key: "crmModule", width: 15 },
    { header: "Action", key: "action", width: 40 },
    { header: "Tip", key: "tip", width: 30 },
    { header: "Status", key: "status", width: 10 },
    { header: "Comment", key: "comment", width: 40 },
  ]
  detailSheet.getRow(1).font = { bold: true }

  for (const tester of testers || []) {
    for (const item of checklistItems || []) {
      const response = responses.find(
        (r) => r.tester_id === tester.id && r.checklist_item_id === item.id
      )
      detailSheet.addRow({
        testerName: tester.name,
        testerEmail: tester.email,
        step: item.step_number,
        path: item.path || "",
        actor: item.actor,
        crmModule: item.crm_module || "",
        action: item.action,
        tip: item.tip || "",
        status: response?.status || "",
        comment: response?.comment || "",
      })
    }
  }

  // Sheet 3: Sign-Offs
  const signoffSheet = workbook.addWorksheet("Sign-Offs")
  signoffSheet.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Date", key: "date", width: 15 },
  ]
  signoffSheet.getRow(1).font = { bold: true }

  for (const s of signoffs || []) {
    signoffSheet.addRow({
      name: s.signoff_name,
      date: new Date(s.signoff_date).toLocaleDateString(),
    })
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${params.slug}-results.xlsx"`,
    },
  })
}
