"use client"

import dynamic from "next/dynamic"

// @uiw/react-md-editor is the single largest dependency pulled into the
// checklist editor bundle. It's only ever rendered once a step/header is
// opened for editing, so it's lazy-loaded here instead of bundled into the
// page's initial JS (mirrors the pattern already used for AnalyticsCharts
// in share/analytics/[slug]/[token]/page.tsx).
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[80px] w-full rounded-md border border-gray-200 bg-gray-50 animate-pulse" />
  ),
})

export default MDEditor
