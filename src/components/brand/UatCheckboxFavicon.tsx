import { cn } from "@/lib/utils"

interface UatCheckboxFaviconProps {
  className?: string
}

export function UatCheckboxFavicon({ className }: UatCheckboxFaviconProps) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-6 w-6", className)} role="img" aria-labelledby="uatCheckboxTitle">
      <title id="uatCheckboxTitle">UAT completed checkbox</title>
      <rect x={8} y={8} width={48} height={48} rx={8} fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={6} />
      <path d="M 19 34 L 27 42 L 45 22" fill="none" stroke="#1a1a1a" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 19 34 L 27 42 L 45 22" fill="none" stroke="#ACCDB5" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
