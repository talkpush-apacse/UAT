"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface SummaryStats {
  totalSteps: number
  totalTesters: number
  totalExecutions: number
  passCount: number
  failCount: number
  blockedCount: number
  naCount: number
  notTestedCount: number
  issueCount: number
}

export default function AISummaryPanel({ slug }: { slug: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSummary(null)
    setStats(null)

    try {
      const res = await fetch(`/api/projects/${slug}/ai-summary`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to generate summary.")
        return
      }

      setSummary(data.summary)
      setStats(data.stats)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const pct = (n: number, total: number) =>
    total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`

  return (
    <div className="space-y-6">
      {/* Generate button — shown when no summary yet */}
      {!summary && !loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-violet-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            AI-Powered UAT Summary
          </h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            Analyze all test executions, identify recurring issues, and generate
            an executive summary with Talkpush findings — powered by Claude.
          </p>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-md">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <Button
            onClick={handleGenerate}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-700">Analyzing UAT results…</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Summary result */}
      {summary && stats && (
        <div className="space-y-6">
          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <CardContent className="pt-4 pb-3 flex items-center gap-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4.5 w-4.5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.totalTesters}</p>
                  <p className="text-xs text-gray-500">Testers</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <CardContent className="pt-4 pb-3 flex items-center gap-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.totalExecutions}</p>
                  <p className="text-xs text-gray-500">Test Executions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <CardContent className="pt-4 pb-3 flex items-center gap-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5 text-green-700" />
                </div>
                <div>
                  <p className="text-xl font-bold text-green-700">
                    {stats.passCount}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({pct(stats.passCount, stats.totalExecutions)})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <CardContent className="pt-4 pb-3 flex items-center gap-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  {stats.failCount + stats.blockedCount > 0 ? (
                    <XCircle className="h-4.5 w-4.5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600">
                    {stats.failCount + stats.blockedCount}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({pct(stats.failCount + stats.blockedCount, stats.totalExecutions)})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">Fail + Review</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary content */}
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-gray-700">AI Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="text-gray-600 border-gray-200"
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="text-gray-600 border-gray-200"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate
                </Button>
              </div>
            </div>
            <CardContent className="pt-5 pb-6 px-5">
              {/* Render markdown-like summary as formatted text */}
              <div className="prose prose-sm prose-gray max-w-none">
                {renderMarkdownBlocks(summary)}
              </div>
            </CardContent>
          </Card>

          {/* Error on regenerate */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Block-level markdown renderer (handles tables, headings, lists)    */
/* ------------------------------------------------------------------ */

function renderMarkdownBlocks(text: string) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Markdown table: collect consecutive pipe-delimited rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      // Parse: first row = header, second row = separator (skip), rest = body
      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map((cell) => cell.trim())

      const headerCells = parseRow(tableLines[0])
      const bodyRows = tableLines.slice(2).map(parseRow) // skip separator row

      elements.push(
        <table key={`tbl-${i}`} className="w-full text-sm my-3 border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {headerCells.map((cell, ci) => (
                <th key={ci} className="text-left py-1.5 px-3 font-semibold text-gray-800 bg-gray-50">
                  {renderInlineFormatting(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-100">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1.5 px-3 text-gray-700">
                    {renderInlineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
      continue
    }

    // H2 headers
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-gray-900 mt-6 mb-2 first:mt-0">
          {line.replace("## ", "")}
        </h2>
      )
      i++
      continue
    }
    // H3 headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-gray-800 mt-4 mb-1">
          {line.replace("### ", "")}
        </h3>
      )
      i++
      continue
    }
    // Bold-only lines (like **Overview**)
    if (line.match(/^\*\*[^*]+\*\*$/)) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-gray-800 mt-5 mb-1">
          {line.replace(/\*\*/g, "")}
        </h3>
      )
      i++
      continue
    }
    // Bullet points
    if (line.match(/^[-•]\s/)) {
      elements.push(
        <li key={i} className="text-sm text-gray-700 leading-relaxed ml-4 list-disc">
          {renderInlineFormatting(line.replace(/^[-•]\s/, ""))}
        </li>
      )
      i++
      continue
    }
    // Numbered list items
    if (line.match(/^\d+\.\s/)) {
      elements.push(
        <li key={i} className="text-sm text-gray-700 leading-relaxed ml-4 list-decimal">
          {renderInlineFormatting(line.replace(/^\d+\.\s/, ""))}
        </li>
      )
      i++
      continue
    }
    // Empty lines
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
      i++
      continue
    }
    // Regular paragraphs
    elements.push(
      <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
        {renderInlineFormatting(line)}
      </p>
    )
    i++
  }

  return elements
}

/* ------------------------------------------------------------------ */
/*  Simple inline markdown formatting (bold, inline code)              */
/* ------------------------------------------------------------------ */

function renderInlineFormatting(text: string) {
  // Split on **bold** patterns and render
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}
