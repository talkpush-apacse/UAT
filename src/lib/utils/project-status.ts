export type ProjectStatus = "Signed Off" | "In Progress" | "Not Started"

export function getProjectStatus(testerCount: number, signoffCount: number): ProjectStatus {
  if (signoffCount > 0) return "Signed Off"
  if (testerCount > 0) return "In Progress"
  return "Not Started"
}
