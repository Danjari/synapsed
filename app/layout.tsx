import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react" 
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RAG Chat System",
  description: "Chat with your documents using RAG",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
    </SessionProvider>
  )
}

