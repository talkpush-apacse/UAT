'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/utils/admin-auth'

const MAX_LINES = 8
const OTHER_LABEL = 'Other'
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type McpUsageBucket = 'hour' | 'day'

export interface McpUsagePoint {
  bucket: string
  [toolName: string]: string | number
}

export interface McpUsageResult {
  points: McpUsagePoint[]
  tools: string[]
  error?: string
}

function bucketStart(date: Date, bucket: McpUsageBucket): number {
  const ms = date.getTime()
  const size = bucket === 'hour' ? HOUR_MS : DAY_MS
  return Math.floor(ms / size) * size
}

function bucketLabel(bucketMs: number, bucket: McpUsageBucket): string {
  const date = new Date(bucketMs)
  if (bucket === 'hour') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Returns tool-call counts bucketed by hour or day, one series per tool
// (capped to the busiest MAX_LINES, the rest folded into "Other"), with
// every bucket in [startIso, endIso) present even if empty — so the line
// chart never silently skips a quiet period.
export async function getMcpToolUsage(
  startIso: string,
  endIso: string,
  bucket: McpUsageBucket
): Promise<McpUsageResult> {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) return { points: [], tools: [], error: 'Unauthorized' }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mcp_tool_calls')
    .select('tool_name, created_at')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(20000)

  if (error) {
    console.error('Failed to load MCP usage data:', error.message)
    return { points: [], tools: [], error: 'Failed to load MCP usage data' }
  }

  const rows = data ?? []

  // Rank tools by total volume in-range so the busiest MAX_LINES get their
  // own line and everything else folds into "Other".
  const totalsByTool = new Map<string, number>()
  for (const row of rows) {
    totalsByTool.set(row.tool_name, (totalsByTool.get(row.tool_name) ?? 0) + 1)
  }
  const rankedTools = Array.from(totalsByTool.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
  const topTools = rankedTools.slice(0, MAX_LINES)
  const hasOther = rankedTools.length > MAX_LINES
  const seriesNames = hasOther ? [...topTools, OTHER_LABEL] : topTools

  const seriesForTool = (toolName: string) =>
    topTools.includes(toolName) ? toolName : hasOther ? OTHER_LABEL : null

  // Pre-fill every bucket in range with zero counts so the chart has a
  // continuous timeline even where nothing happened.
  const bucketSize = bucket === 'hour' ? HOUR_MS : DAY_MS
  const start = bucketStart(new Date(startIso), bucket)
  const end = new Date(endIso).getTime()
  const pointsByBucket = new Map<number, McpUsagePoint>()
  for (let ms = start; ms < end; ms += bucketSize) {
    const point: McpUsagePoint = { bucket: bucketLabel(ms, bucket) }
    for (const name of seriesNames) point[name] = 0
    pointsByBucket.set(ms, point)
  }

  for (const row of rows) {
    const seriesName = seriesForTool(row.tool_name)
    if (!seriesName) continue
    const ms = bucketStart(new Date(row.created_at), bucket)
    const point = pointsByBucket.get(ms)
    if (!point) continue
    point[seriesName] = (point[seriesName] as number) + 1
  }

  return {
    points: Array.from(pointsByBucket.values()),
    tools: seriesNames,
  }
}
