import { useId } from "react"
import { cn } from "@/lib/utils"

interface UatBadgeProps {
  className?: string
}

export function UatBadge({ className }: UatBadgeProps) {
  const maskId = useId()

  return (
    <svg viewBox="0 0 256 256" className={cn("h-32 w-32", className)} role="img" aria-labelledby="uatBadgeTitle">
      <title id="uatBadgeTitle">UAT Tool badge</title>
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <path d="M 102 140 L 128 166 L 176 102" fill="none" stroke="#000000" strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <rect x={16} y={16} width={224} height={224} rx={20} fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={8} />
      <text
        x={128}
        y={172}
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', system-ui, sans-serif"
        fontWeight={700}
        fontSize={92}
        fill="#1a1a1a"
        letterSpacing="-0.02em"
        textAnchor="middle"
        mask={`url(#${maskId})`}
      >
        UAT
      </text>
      <path d="M 102 140 L 128 166 L 176 102" fill="none" stroke="#1a1a1a" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 102 140 L 128 166 L 176 102" fill="none" stroke="#ACCDB5" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
