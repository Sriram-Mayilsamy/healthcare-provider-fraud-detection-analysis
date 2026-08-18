import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

import { InspectProvider } from "@/components/dashboard/inspect-context"
import { ProviderSheet } from "@/components/dashboard/provider-sheet"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/lib/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"

import "./globals.css"

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Provider Risk Intelligence",
  description:
    "Fraud risk is a probability-based model signal for investigation prioritization—not a fraud determination.",
}

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <AuthProvider>
          <TooltipProvider>
            <InspectProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <ProviderSheet />
              <Toaster theme="light" />
            </InspectProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
