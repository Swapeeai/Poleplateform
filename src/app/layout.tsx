import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { HeaderFallback, SiteHeader } from "@/components/site-header"
import { APP_NAME, copy } from "@/lib/copy"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: copy.metaDescription,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* The header reads the login cookie, so it waits behind this boundary.
            The rest of the shell can show immediately. */}
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
