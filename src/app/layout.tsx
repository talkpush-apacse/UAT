import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { DM_Sans, Space_Grotesk } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { MixpanelTracker } from "@/components/analytics/mixpanel-tracker"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
})

// Space Grotesk — used for navigation, wordmark, and section headers (font-nav).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FEFEF2",
}

export const metadata: Metadata = {
  title: "Talkpush UAT Checklist",
  description: "User Acceptance Testing checklist management",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UAT Checklist",
  },
  icons: {
    icon: "/uat-checkbox-favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
        <Suspense fallback={null}>
          <MixpanelTracker />
        </Suspense>
      </body>
    </html>
  )
}
