import type React from "react"
import "./globals.css"
import ClientLayout from "./client-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { NotificationProvider } from "@/components/notification"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="font-sans antialiased">
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
    title: "Avla - AI Video Assessment Platform",
    description: "Platform SaaS profesional untuk layanan teknologi informasi terkelola",
    generator: "v0.dev",
}
