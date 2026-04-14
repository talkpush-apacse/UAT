import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Circle,
  StyleSheet,
} from "@react-pdf/renderer"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface FailedStepRow {
  stepNumber: number
  actor: string
  action: string
  testerName: string
  testerEmail: string
  status: string
  findingType: string | null
  resolutionStatus: string
  notes: string | null
  comment: string | null
}

interface TesterParticipation {
  name: string
  email: string
  testCompleted: boolean
  answered: number
  total: number
  pass: number
  fail: number
  na: number
  blocked: number
}

export interface AnalyticsPDFDocumentProps {
  companyName?: string
  generatedAt?: string
  completionStats: { registered: number; started: number; completed: number }
  overallBreakdown: { name: string; value: number }[]
  findingsBreakdown: { entries: { name: string; value: number }[]; total: number }
  failedStepsRows: FailedStepRow[]
  testerParticipation: TesterParticipation[]
}

/* ------------------------------------------------------------------ */
/*  Color constants (hex only — no Tailwind or CSS vars in react-pdf)  */
/* ------------------------------------------------------------------ */

const BRAND = {
  sage: "#8BB8A8",
  sageDarker: "#3B7A6B",
  sageLightest: "#E3F2F0",
}

const PDF_STATUS_COLORS: Record<string, string> = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  "N/A": "#94a3b8",
  Blocked: "#f97316",
  "Up For Review": "#f59e0b",
  "Not Tested": "#d1d5db",
}

const PDF_FINDING_COLORS: Record<string, string> = {
  "Expected Behavior": "#22c55e",
  "Bug/Glitch": "#ef4444",
  "Configuration Issue": "#f97316",
  "User Error": "#eab308",
  "Blocked": "#6b7280",
  "Not Yet Reviewed": "#d1d5db",
}

const PDF_ACTOR_COLORS: Record<string, { bg: string; text: string }> = {
  Candidate: { bg: "#e0f2fe", text: "#075985" },
  Talkpush: { bg: "#E3F2F0", text: "#3B7A6B" },
  Recruiter: { bg: "#ede9fe", text: "#5b21b6" },
  "Referrer/Vendor": { bg: "#fef3c7", text: "#92400e" },
}

const PDF_RESOLUTION_COLORS: Record<string, { bg: string; text: string }> = {
  "Not Yet Started": { bg: "#fef3c7", text: "#b45309" },
  "In Progress": { bg: "#dbeafe", text: "#1d4ed8" },
  "For Retesting": { bg: "#dbeafe", text: "#1d4ed8" },
  Done: { bg: "#dcfce7", text: "#166534" },
  pending: { bg: "#fef3c7", text: "#b45309" },
}

const STATUS_DISPLAY: Record<string, string> = {
  Pass: "Pass",
  Fail: "Fail",
  "N/A": "N/A",
  Blocked: "Up For Review",
  "Not Tested": "Not Tested",
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1f2937",
    paddingTop: 40,
    paddingBottom: 52,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: "#ffffff",
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },

  /* Header */
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  headerLabel: {
    fontSize: 7,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 3,
  },
  headerDate: {
    fontSize: 8,
    color: "#6b7280",
  },

  /* Section header row */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  sectionDivider: {
    flex: 1,
    height: 0.5,
    backgroundColor: "#e5e7eb",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 8,
    marginTop: -4,
  },

  /* KPI Cards */
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderStyle: "solid",
    padding: 14,
    alignItems: "center",
  },
  kpiIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kpiNumber: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 1,
  },
  kpiCaption: {
    fontSize: 7,
    color: "#9ca3af",
  },

  /* Donut chart + legend */
  chartCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderStyle: "solid",
  },
  legendColumn: {
    flex: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    fontSize: 8,
    color: "#374151",
  },
  legendCount: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginRight: 2,
  },
  legendPct: {
    fontSize: 7,
    color: "#9ca3af",
  },

  /* Steps Requiring Attention */
  stepBlock: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 6,
    marginBottom: 7,
    overflow: "hidden",
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#f9fafb",
    padding: 8,
  },
  stepNumberBadge: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#4b5563",
  },
  actorBadge: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  stepActionText: {
    flex: 1,
    fontSize: 8,
    color: "#374151",
    lineHeight: 1.45,
  },
  stepGrid: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
  },
  stepCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 0.5,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
  },
  stepColLast: {
    flex: 1,
    padding: 8,
  },
  stepColLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  testerName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 3,
  },
  commentText: {
    fontSize: 7.5,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  emptyItalic: {
    fontSize: 7,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  pillText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },

  /* Tester table */
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    borderBottomStyle: "solid",
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    borderBottomStyle: "solid",
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    padding: 6,
  },
  tableCell: {
    fontSize: 8,
    color: "#374151",
    padding: 6,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    width: 50,
    marginTop: 3,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8BB8A8",
  },
})

/* ------------------------------------------------------------------ */
/*  SVG Donut Chart helpers                                            */
/* ------------------------------------------------------------------ */

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function buildDonutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  // Clamp to prevent a full-circle arc collapsing to a point
  const clampedEnd =
    endAngle >= startAngle + 360 ? startAngle + 359.99 : endAngle
  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0

  const os = polarToCartesian(cx, cy, outerR, startAngle)
  const oe = polarToCartesian(cx, cy, outerR, clampedEnd)
  const ie = polarToCartesian(cx, cy, innerR, clampedEnd)
  const is_ = polarToCartesian(cx, cy, innerR, startAngle)

  return [
    `M ${os.x.toFixed(3)} ${os.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oe.x.toFixed(3)} ${oe.y.toFixed(3)}`,
    `L ${ie.x.toFixed(3)} ${ie.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${is_.x.toFixed(3)} ${is_.y.toFixed(3)}`,
    "Z",
  ].join(" ")
}

function computeDonutSegments(
  data: { name: string; value: number }[],
  colors: Record<string, string>,
  gapDeg = 2
): { name: string; value: number; color: string; path: string }[] {
  const nonZero = data.filter((d) => d.value > 0)
  const total = nonZero.reduce((s, d) => s + d.value, 0)
  if (total === 0) return []

  const cx = 75
  const cy = 75
  const outerR = 65
  const innerR = 38

  const totalGap = nonZero.length * gapDeg
  const available = 360 - totalGap

  let angle = 0
  return nonZero.map((d) => {
    const segDeg = (d.value / total) * available
    const start = angle
    const end = start + segDeg
    angle = end + gapDeg
    return {
      name: d.name,
      value: d.value,
      color: colors[d.name] ?? "#d1d5db",
      path: buildDonutSegmentPath(cx, cy, outerR, innerR, start, end),
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

/* ── PDF Header ── */
function PDFHeader({
  companyName,
  generatedAt,
}: {
  companyName?: string
  generatedAt?: string
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerLabel}>UAT Analytics Report</Text>
      {companyName ? (
        <Text style={styles.headerTitle}>{companyName}</Text>
      ) : null}
      {generatedAt ? (
        <Text style={styles.headerDate}>Generated {generatedAt}</Text>
      ) : null}
    </View>
  )
}

/* ── Section 1: KPI Cards ── */
function PDFSection1KPICards({
  stats,
}: {
  stats: { registered: number; started: number; completed: number }
}) {
  const pct = (n: number, d: number) =>
    d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`

  const cards = [
    {
      label: "Registered",
      caption: "Testers who signed up",
      value: stats.registered,
      numColor: BRAND.sageDarker,
      circleColor: BRAND.sageLightest,
      dotColor: BRAND.sageDarker,
    },
    {
      label: "Started",
      caption: `${pct(stats.started, stats.registered)} of registered`,
      value: stats.started,
      numColor: "#2563eb",
      circleColor: "#dbeafe",
      dotColor: "#2563eb",
    },
    {
      label: "Completed",
      caption: `${pct(stats.completed, stats.registered)} of registered`,
      value: stats.completed,
      numColor: "#16a34a",
      circleColor: "#dcfce7",
      dotColor: "#16a34a",
    },
  ]

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>UAT Summary Report</Text>
        <View style={styles.sectionDivider} />
      </View>
      <View style={styles.kpiRow}>
        {cards.map((card) => (
          <View key={card.label} style={styles.kpiCard}>
            <View
              style={[styles.kpiIconCircle, { backgroundColor: card.circleColor }]}
            >
              <View
                style={[styles.kpiDot, { backgroundColor: card.dotColor }]}
              />
            </View>
            <Text style={[styles.kpiNumber, { color: card.numColor }]}>
              {card.value}
            </Text>
            <Text style={styles.kpiLabel}>{card.label}</Text>
            <Text style={styles.kpiCaption}>{card.caption}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/* ── Donut chart SVG ── */
function PDFDonutChart({
  data,
  colors,
}: {
  data: { name: string; value: number }[]
  colors: Record<string, string>
}) {
  const segments = computeDonutSegments(data, colors)
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Svg viewBox="0 0 150 150" width={120} height={120}>
      {/* Background ring */}
      <Circle
        cx="75"
        cy="75"
        r="52"
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="27"
      />
      {/* Data segments */}
      {segments.map((seg, i) => (
        <Path key={i} d={seg.path} fill={seg.color} />
      ))}
      {/* Center label — total count */}
      <Text
        style={{
          fontSize: 18,
          fontFamily: "Helvetica-Bold",
          fill: "#111827",
          textAnchor: "middle",
        }}
        x="75"
        y="72"
      >
        {total === 0 ? "—" : String(total)}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fill: "#6b7280",
          textAnchor: "middle",
        }}
        x="75"
        y="85"
      >
        total
      </Text>
    </Svg>
  )
}

/* ── Shared donut section (Sections 2 & 3) ── */
function PDFDonutSection({
  title,
  subtitle,
  data,
  colors,
  displayNames,
}: {
  title: string
  subtitle?: string
  data: { name: string; value: number }[]
  colors: Record<string, string>
  displayNames?: Record<string, string>
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionDivider} />
      </View>
      {subtitle ? (
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      ) : null}
      <View style={styles.chartCard}>
        <PDFDonutChart data={data} colors={colors} />
        {/* Legend */}
        <View style={styles.legendColumn}>
          {data.map((entry) => {
            const pctLabel =
              total === 0
                ? "0%"
                : `${Math.round((entry.value / total) * 100)}%`
            const label = displayNames?.[entry.name] ?? entry.name
            return (
              <View key={entry.name} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors[entry.name] ?? "#d1d5db" },
                  ]}
                />
                <Text style={styles.legendLabel}>{label}</Text>
                <Text style={styles.legendCount}>{entry.value}</Text>
                <Text style={styles.legendPct}>({pctLabel})</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

/* ── Section 4: Steps Requiring Attention ── */
function PDFSection4Steps({ rows }: { rows: FailedStepRow[] }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Steps Requiring Attention</Text>
        <View style={styles.sectionDivider} />
      </View>
      <Text style={styles.sectionSubtitle}>
        All steps with a Fail or Up For Review response, with admin review
        remarks
      </Text>

      {rows.length === 0 ? (
        <View
          style={{
            padding: 20,
            alignItems: "center",
            backgroundColor: "#f9fafb",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            borderStyle: "solid",
          }}
        >
          <Text style={{ fontSize: 8, color: "#6b7280" }}>
            No failed or flagged steps
          </Text>
        </View>
      ) : (
        rows.map((row, idx) => {
          const actorColors =
            PDF_ACTOR_COLORS[row.actor] ?? { bg: "#f3f4f6", text: "#374151" }
          const resColors =
            PDF_RESOLUTION_COLORS[row.resolutionStatus] ?? {
              bg: "#f3f4f6",
              text: "#374151",
            }
          const findingBg =
            row.findingType === "Expected Behavior"
              ? "#dcfce7"
              : row.findingType === "Bug/Glitch"
              ? "#fee2e2"
              : row.findingType === "User Error"
              ? "#fef9c3"
              : row.findingType === "Blocked"
              ? "#f3f4f6"
              : "#ffedd5"
          const findingText =
            row.findingType === "Expected Behavior"
              ? "#166534"
              : row.findingType === "Bug/Glitch"
              ? "#991b1b"
              : row.findingType === "User Error"
              ? "#713f12"
              : row.findingType === "Blocked"
              ? "#374151"
              : "#9a3412"

          return (
            // wrap={false} prevents a card splitting across pages
            <View key={idx} style={styles.stepBlock} wrap={false}>
              {/* Step header */}
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepNumberBadge}>Step {row.stepNumber}</Text>
                <Text
                  style={[
                    styles.actorBadge,
                    {
                      backgroundColor: actorColors.bg,
                      color: actorColors.text,
                    },
                  ]}
                >
                  {row.actor}
                </Text>
                <Text style={styles.stepActionText}>{row.action}</Text>
              </View>

              {/* 3-column grid */}
              <View style={styles.stepGrid}>
                {/* Col 1: Tester Report */}
                <View style={styles.stepCol}>
                  <Text style={styles.stepColLabel}>Tester Report</Text>
                  <Text style={styles.testerName}>{row.testerName}</Text>
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor:
                          row.status === "Fail" ? "#fee2e2" : "#fef3c7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            row.status === "Fail" ? "#991b1b" : "#b45309",
                        },
                      ]}
                    >
                      {row.status === "Fail" ? "Fail" : "Up For Review"}
                    </Text>
                  </View>
                  {row.comment ? (
                    <Text style={styles.commentText}>{row.comment}</Text>
                  ) : (
                    <Text style={styles.emptyItalic}>No comment provided</Text>
                  )}
                </View>

                {/* Col 2: Talkpush Finding */}
                <View style={styles.stepCol}>
                  <Text style={styles.stepColLabel}>Talkpush Finding</Text>
                  {row.findingType ? (
                    <>
                      <View
                        style={[
                          styles.pill,
                          { backgroundColor: findingBg },
                        ]}
                      >
                        <Text
                          style={[styles.pillText, { color: findingText }]}
                        >
                          {row.findingType}
                        </Text>
                      </View>
                      {row.notes ? (
                        <Text style={styles.commentText}>{row.notes}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.emptyItalic}>Not yet reviewed</Text>
                  )}
                </View>

                {/* Col 3: Resolution */}
                <View style={styles.stepColLast}>
                  <Text style={styles.stepColLabel}>Resolution</Text>
                  <View
                    style={[styles.pill, { backgroundColor: resColors.bg }]}
                  >
                    <Text style={[styles.pillText, { color: resColors.text }]}>
                      {row.resolutionStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

/* ── Section 5: Tester Participation Table ── */
function PDFSection5TesterTable({
  testers,
}: {
  testers: TesterParticipation[]
}) {
  // Flex column width ratios
  const COL_TESTER = 3
  const COL_PROGRESS = 2
  const COL_STAT = 1
  const COL_COMPLETED = 1.5

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tester Participation Summary</Text>
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: COL_TESTER }]}>
            Tester
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: COL_PROGRESS }]}>
            Steps Done
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              { flex: COL_STAT, textAlign: "center" },
            ]}
          >
            Pass
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              { flex: COL_STAT, textAlign: "center" },
            ]}
          >
            Fail
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              { flex: COL_STAT, textAlign: "center" },
            ]}
          >
            N/A
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              { flex: COL_STAT, textAlign: "center" },
            ]}
          >
            Review
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              { flex: COL_COMPLETED, textAlign: "center" },
            ]}
          >
            Completed
          </Text>
        </View>

        {/* Rows */}
        {testers.map((t, idx) => {
          const pct =
            t.total === 0 ? 0 : Math.round((t.answered / t.total) * 100)
          const RowStyle =
            idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt

          return (
            <View key={idx} style={RowStyle} wrap={false}>
              {/* Tester name + email */}
              <View style={[styles.tableCell, { flex: COL_TESTER }]}>
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: "Helvetica-Bold",
                    color: "#1f2937",
                  }}
                >
                  {t.name}
                </Text>
                <Text style={{ fontSize: 7, color: "#9ca3af" }}>
                  {t.email}
                </Text>
              </View>

              {/* Steps Done: count + progress bar */}
              <View
                style={[
                  styles.tableCell,
                  { flex: COL_PROGRESS, justifyContent: "center" },
                ]}
              >
                <Text style={{ fontSize: 7, color: "#374151" }}>
                  {t.answered}/{t.total}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${pct}%` as unknown as number },
                    ]}
                  />
                </View>
              </View>

              {/* Pass */}
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: COL_STAT,
                    textAlign: "center",
                    color: "#16a34a",
                    fontFamily: "Helvetica-Bold",
                  },
                ]}
              >
                {t.pass}
              </Text>

              {/* Fail */}
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: COL_STAT,
                    textAlign: "center",
                    color: t.fail > 0 ? "#dc2626" : "#9ca3af",
                    fontFamily: "Helvetica-Bold",
                  },
                ]}
              >
                {t.fail}
              </Text>

              {/* N/A */}
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: COL_STAT,
                    textAlign: "center",
                    color: "#6b7280",
                    fontFamily: "Helvetica-Bold",
                  },
                ]}
              >
                {t.na}
              </Text>

              {/* Review (blocked) */}
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: COL_STAT,
                    textAlign: "center",
                    color: t.blocked > 0 ? "#d97706" : "#9ca3af",
                    fontFamily: "Helvetica-Bold",
                  },
                ]}
              >
                {t.blocked}
              </Text>

              {/* Completed badge */}
              <View
                style={[
                  styles.tableCell,
                  {
                    flex: COL_COMPLETED,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: t.testCompleted ? "#dcfce7" : "#f3f4f6",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: t.testCompleted ? "#166534" : "#6b7280" },
                    ]}
                  >
                    {t.testCompleted ? "Done" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Root document export                                               */
/* ------------------------------------------------------------------ */

export default function AnalyticsPDFDocument({
  companyName,
  generatedAt,
  completionStats,
  overallBreakdown,
  findingsBreakdown,
  failedStepsRows,
  testerParticipation,
}: AnalyticsPDFDocumentProps) {
  return (
    <Document
      title={`UAT Analytics Report${companyName ? ` — ${companyName}` : ""}`}
      author="Talkpush"
      creator="UAT Checklist Web App"
    >
      <Page size="A4" style={styles.page}>
        {/* Fixed footer with page numbers on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>UAT Analytics Report — Talkpush</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        <PDFHeader companyName={companyName} generatedAt={generatedAt} />

        <PDFSection1KPICards stats={completionStats} />

        <PDFDonutSection
          title="Overall Status Breakdown"
          data={overallBreakdown}
          colors={PDF_STATUS_COLORS}
          displayNames={STATUS_DISPLAY}
        />

        {findingsBreakdown.total > 0 && (
          <PDFDonutSection
            title="Talkpush Findings Breakdown"
            subtitle={`Admin review findings for all non-Pass steps (${findingsBreakdown.total} total)`}
            data={findingsBreakdown.entries}
            colors={PDF_FINDING_COLORS}
          />
        )}

        <PDFSection4Steps rows={failedStepsRows} />

        <PDFSection5TesterTable testers={testerParticipation} />
      </Page>
    </Document>
  )
}
