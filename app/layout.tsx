import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./client-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { NotificationProvider } from "@/components/notification"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                    <AuthProvider>
                        <NotificationProvider>
                            <ClientLayout>{children}</ClientLayout>
                        </NotificationProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}

export const metadata = {
    generator: "v0.dev",
}
