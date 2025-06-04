// import type React from "react"
// import type { Metadata } from "next"
// import { Inter } from "next/font/google"
// import "./globals.css"
// import { SessionProvider } from "next-auth/react" 
// const inter = Inter({ subsets: ["latin"] })

// export const metadata: Metadata = {
//   title: "RAG Chat System",
//   description: "Chat with your documents using RAG",
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <SessionProvider>
//     <html lang="en">
//       <body className={inter.className}>{children}</body>
      
//     </html>
//     </SessionProvider>
//   )
// }

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/themeProvider"
import { SessionProvider } from "next-auth/react" 
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SynapsEd - Personalized Learning Made Simple",
  description: "A platform that builds unique learning journeys for every student in a classroom",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SessionProvider>
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
    </SessionProvider>
  )
}